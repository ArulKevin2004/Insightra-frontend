import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

const TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];

// ── Tuning constants ────────────────────────────────────────────────────────
const TICK_MS        = 2500;   // new point every 2.5 s
const DRIFT_WINDOW   = 10;     // rolling error baseline window size
const DRIFT_FACTOR   = 2.5;    // flag drift only when error > 2.5x rolling mean
const DRIFT_ABS_PCT  = 3.0;    // absolute min error % to even consider drift
const VISIBLE_WINDOW = 40;     // x-axis visible data points
const WARMUP_STEPS   = 25;     // points loaded before streaming begins

// ── Types ───────────────────────────────────────────────────────────────────
interface ChartPoint {
  t: number;
  timeStr: string;      // "HH:MM" shown on x-axis
  actual: number | null;
  predicted: number | null;
}

interface DriftEvent {
  t: number;
  timeStr: string;
  fromModel: string;
  toModel: string;
  delta: number;
}

// ── Custom drift label rendered on ReferenceLine ─────────────────────────────
const DriftLabel = ({ viewBox, event }: any) => {
  const { x } = viewBox;
  const tag = `${event.fromModel}→${event.toModel}`;
  const w = tag.length * 5.5 + 12;
  return (
    <g transform={`translate(${x - w / 2}, 6)`}>
      <rect x={0} y={0} width={w} height={17} rx={3} fill="#7F1D1D" />
      <text x={w / 2} y={11.5} textAnchor="middle" fill="#FCA5A5" fontSize={8} fontWeight="bold">
        {tag}
      </text>
    </g>
  );
};

// ── Format timestamp → "HH:MM" ───────────────────────────────────────────────
const toTimeStr = (iso: string): string => {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

// ── Local JavaScript Predictors for Warmup Phase ─────────────────────────────
const predictStepLocal = (points: number[], model: string): number => {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return points[0];

  if (model === 'SimpleES') {
    let level = points[0];
    const alpha = 0.3;
    for (let i = 1; i < n; i++) {
      level = alpha * points[i] + (1 - alpha) * level;
    }
    return level;
  } else if (model === 'DriftModel') {
    const drift = (points[n - 1] - points[0]) / (n - 1);
    return points[n - 1] + drift;
  } else if (model === 'Holt-Winters') {
    let level = points[0];
    let trend = points[1] - points[0];
    const alpha = 0.3;
    const beta = 0.1;
    for (let i = 1; i < n; i++) {
      const lastLevel = level;
      level = alpha * points[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }
    return level + trend;
  } else {
    // Default ARIMA / Linear Regression projection
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += points[i];
      sumXY += i * points[i];
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;
    return intercept + slope * n;
  }
};

// ── Component ────────────────────────────────────────────────────────────────
const PredictionChart: React.FC = () => {
  const [ticker, setTicker]           = useState<string>('AAPL');
  const [chartData, setChartData]     = useState<ChartPoint[]>([]);
  const [activeModel, setActiveModel] = useState<string>('—');
  const [mape, setMape]               = useState<number | null>(null);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [streamStatus, setStreamStatus] = useState<'loading' | 'streaming' | 'paused' | 'error'>('loading');
  const [errorMsg, setErrorMsg]       = useState<string>('');

  const stepRef        = useRef<number>(0);
  const historyRef     = useRef<{ timestamp: string; value: number }[]>([]);
  const errorsRef      = useRef<number[]>([]);
  const modelRef       = useRef<string>('ARIMA');
  const nextPredRef    = useRef<number | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef    = useRef<boolean>(false);
  const isRunningRef   = useRef<boolean>(false);

  // ── API helpers ─────────────────────────────────────────────────────────────

  const fetchStep = useCallback(async (step: number) => {
    const res = await fetch(`http://localhost:8000/api/v1/predict/stream/${ticker}?step=${step}`);
    if (!res.ok) throw new Error(`Stream error (step ${step}): ${res.statusText}`);
    return res.json();
  }, [ticker]);

  const fetchNextPrediction = useCallback(async (
    history: { timestamp: string; value: number }[]
  ) => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/predict/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, horizon: 1, seasonal_period: null }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        value: data.predictions[0].value as number,
        model: data.model_selected as string,
        mape: data.metrics.mape as number,
      };
    } catch {
      return null;
    }
  }, []);

  const runTournament = useCallback(async (
    history: { timestamp: string; value: number }[],
    fromModel: string
  ): Promise<string> => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/predict/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, seasonal_period: null }),
      });
      if (!res.ok) return fromModel;
      const data = await res.json();
      return data.winner as string;
    } catch {
      return fromModel;
    }
  }, []);

  // ── Initialise stream for the current ticker ────────────────────────────────
  const initialise = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    isRunningRef.current = false;
    setStreamStatus('loading');
    setChartData([]);
    setDriftEvents([]);
    errorsRef.current  = [];
    historyRef.current = [];
    nextPredRef.current = null;
    stepRef.current    = 0;
    isPausedRef.current = false;

    try {
      // Warm-up: pull WARMUP_STEPS real points
      const warmupPoints: ChartPoint[] = [];
      const rawPoints: number[] = [];

      for (let i = 0; i < WARMUP_STEPS; i++) {
        const resp = await fetchStep(i);
        if (resp.done) break;

        historyRef.current.push({ timestamp: resp.point.timestamp, value: resp.point.value });
        rawPoints.push(resp.point.value);

        // Pre-fit warmup forecast using local models so both lines are drawn immediately
        let predictedLocal: number | null = null;
        if (i > 0) {
          predictedLocal = predictStepLocal(rawPoints.slice(0, i), modelRef.current);
        }

        warmupPoints.push({
          t: i,
          timeStr: toTimeStr(resp.point.timestamp),
          actual: resp.point.value,
          predicted: predictedLocal,
        });
      }
      stepRef.current = warmupPoints.length;

      // Get first production prediction (for step WARMUP_STEPS)
      const pred = await fetchNextPrediction(historyRef.current);
      if (pred) {
        nextPredRef.current = pred.value;
        modelRef.current    = pred.model;
        setActiveModel(pred.model);
        setMape(pred.mape);
      }

      // Append the initial future lookahead forecast point at the end
      if (nextPredRef.current !== null && warmupPoints.length > 0) {
        const lastWarmupPoint = warmupPoints[warmupPoints.length - 1];
        const lastDate = new Date(historyRef.current[historyRef.current.length - 1].timestamp);
        // Estimate next timestamp (+5 mins)
        const nextDate = new Date(lastDate.getTime() + 5 * 60 * 1000);
        
        warmupPoints.push({
          t: stepRef.current,
          timeStr: toTimeStr(nextDate.toISOString()),
          actual: null, // Future step has no actual value yet
          predicted: nextPredRef.current, // Streches forecast line 1 step ahead!
        });
      }

      setChartData(warmupPoints);
      setStreamStatus('streaming');
      isRunningRef.current = true;
    } catch (e: any) {
      setStreamStatus('error');
      setErrorMsg(e.message || 'Failed to connect');
    }
  }, [ticker, fetchStep, fetchNextPrediction]);

  useEffect(() => {
    initialise();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ticker]);

  // ── Streaming tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (streamStatus !== 'streaming') return;

    timerRef.current = setInterval(async () => {
      if (isPausedRef.current || !isRunningRef.current) return;

      const step = stepRef.current;
      try {
        const resp = await fetchStep(step);

        if (resp.done) {
          await initialise();
          return;
        }

        const actualVal    = resp.point.value as number;
        const predictedVal = nextPredRef.current; // The forecast committed at step - 1
        const timeStr      = toTimeStr(resp.point.timestamp);

        // ── Drift detection (adaptive rolling baseline) ──────────────────────
        let isDrift = false;
        if (predictedVal !== null) {
          const errorPct = (Math.abs(actualVal - predictedVal) / Math.max(Math.abs(actualVal), 1e-8)) * 100;
          const wins = errorsRef.current;
          if (wins.length >= 4) {
            const rollingMean = wins.reduce((a, b) => a + b, 0) / wins.length;
            isDrift =
              errorPct > DRIFT_ABS_PCT &&
              errorPct > rollingMean * DRIFT_FACTOR;
          }
          errorsRef.current = [...wins.slice(-(DRIFT_WINDOW - 1)), errorPct];
        }

        // ── Update historical data array ─────────────────────────────────────
        setChartData(prev => {
          // 1. Remove the previous "virtual forecast lookahead" point from the end
          const updated = prev.filter(p => p.actual !== null);
          
          // 2. Add the actual value to the current step (which now has happened!)
          const completedPoint: ChartPoint = {
            t: step,
            timeStr,
            actual: actualVal,
            predicted: predictedVal,
          };
          
          let nextList = [...updated, completedPoint];

          // 3. Keep standard sliding window constraint
          if (nextList.length > VISIBLE_WINDOW) {
            nextList = nextList.slice(nextList.length - VISIBLE_WINDOW);
          }
          return nextList;
        });

        // ── Handle drift & hot-swapping ──────────────────────────────────────
        const prevModel = modelRef.current;
        if (isDrift && historyRef.current.length >= 15) {
          const winner = await runTournament(historyRef.current, prevModel);
          modelRef.current = winner;
          setActiveModel(winner);
          errorsRef.current = [];

          if (winner !== prevModel && predictedVal !== null) {
            setDriftEvents(prev => [
              ...prev,
              { t: step, timeStr, fromModel: prevModel, toModel: winner, delta: actualVal - predictedVal },
            ]);
          }
        }

        // ── Grow history and calculate predicted[step + 1] ───────────────────
        historyRef.current.push({ timestamp: resp.point.timestamp, value: actualVal });
        const pred = await fetchNextPrediction(historyRef.current);
        
        if (pred) {
          nextPredRef.current = pred.value;
          if (!isDrift) setActiveModel(pred.model);
          setMape(pred.mape);

          // ── Append the new future lookahead forecast point ──────────────────
          const lastDate = new Date(resp.point.timestamp);
          const nextDate = new Date(lastDate.getTime() + 5 * 60 * 1000); // +5 minutes

          setChartData(prev => {
            const lookaheadPoint: ChartPoint = {
              t: step + 1,
              timeStr: toTimeStr(nextDate.toISOString()),
              actual: null, // Future step
              predicted: pred.value, // Committing next forecast
            };
            return [...prev, lookaheadPoint];
          });
        }

        stepRef.current = step + 1;
      } catch (e: any) {
        console.error('Tick error:', e);
      }
    }, TICK_MS);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [streamStatus]);

  // ── Toggle pause ─────────────────────────────────────────────────────────────
  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setStreamStatus(s => (s === 'paused' ? 'streaming' : 'paused'));
  };

  // ── Y-axis domain (tight padding around min/max) ─────────────────────────────
  const allVals = chartData.flatMap(d => [d.actual, d.predicted]).filter(v => v !== null) as number[];
  const yMin = allVals.length ? Math.min(...allVals) : 0;
  const yMax = allVals.length ? Math.max(...allVals) : 1;
  const yPad = (yMax - yMin) * 0.08 || 1;

  const isLoading = streamStatus === 'loading';
  const isError   = streamStatus === 'error';

  // ── X-axis interval ─────────────────────────────────────────────────────────
  const xInterval = Math.max(1, Math.floor(chartData.length / 10));

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 p-4 flex flex-col gap-3">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Ticker selector */}
          <div className="flex items-center gap-0.5 bg-gray-900 rounded-lg p-0.5">
            {TICKERS.map(t => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                disabled={isLoading}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                  ticker === t
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Status pill */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
            streamStatus === 'streaming' ? 'bg-emerald-900/60 text-emerald-400' :
            streamStatus === 'paused'    ? 'bg-yellow-900/60 text-yellow-400'   :
            streamStatus === 'loading'   ? 'bg-blue-900/60 text-blue-400'       :
            'bg-red-900/60 text-red-400'
          }`}>
            {streamStatus === 'streaming' ? '● Live 5m' :
             streamStatus === 'paused'    ? '⏸ Paused'  :
             streamStatus === 'loading'   ? '⟳ Loading' : '✕ Error'}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
          <span>Champion: <strong className="text-white">{activeModel}</strong></span>
          {mape !== null && (
            <span>MAPE: <strong className="text-white">{mape.toFixed(2)}%</strong></span>
          )}
          <button
            onClick={togglePause}
            disabled={isLoading || isError}
            className="px-2.5 py-1 rounded-md border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-all text-xs"
          >
            {isPausedRef.current ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 text-xs text-gray-500 pl-1">
        <span className="flex items-center gap-1.5">
          <span className="block w-6 h-0.5 bg-blue-500 rounded" />
          Actual (5-min)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block w-6 border-t-2 border-dashed border-emerald-400" />
          Forecast (next 5-min)
        </span>
        {driftEvents.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="block h-3 w-px bg-red-500" />
            Model swap ({driftEvents.length})
          </span>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <div className="relative" style={{ height: 360 }}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 rounded-lg z-10">
            <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-xs text-gray-400">Fetching 5-min intraday data…</p>
          </div>
        )}
        {isError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <p className="text-sm font-semibold text-red-400">Connection failed</p>
            <p className="text-xs text-gray-500 mt-1">{errorMsg}</p>
            <p className="text-xs text-gray-600 mt-0.5">FastAPI must be running on :8000</p>
            <button
              onClick={initialise}
              className="mt-3 px-3 py-1 text-xs bg-blue-700 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 24, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="#1F2937"
                vertical={false}
              />

              <XAxis
                dataKey="timeStr"
                tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                interval={xInterval}
                tickMargin={8}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                domain={[yMin - yPad, yMax + yPad]}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                width={68}
                tickCount={7}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #1E293B',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#F1F5F9',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: '#64748B', marginBottom: 6, fontFamily: 'monospace' }}
                formatter={(value: any, name: string) => [
                  `$${parseFloat(value).toFixed(2)}`,
                  name === 'actual' ? 'Actual' : 'Forecast',
                ]}
                labelFormatter={(label: string) => `⏱ ${label}`}
              />

              {driftEvents.map((evt, i) => (
                <ReferenceLine
                  key={i}
                  x={evt.timeStr}
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  label={(props: any) => <DriftLabel {...props} event={evt} />}
                />
              ))}

              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3B82F6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                connectNulls={true}
                name="actual"
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#34D399"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, fill: '#34D399', strokeWidth: 0 }}
                connectNulls={true}
                name="predicted"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Model Swap Log ───────────────────────────────────────────────── */}
      {driftEvents.length > 0 && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-600 mb-2 font-mono uppercase tracking-wider">Model Swaps</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {driftEvents.map((evt, i) => (
              <span key={i} className="text-xs text-gray-400 font-mono">
                <span className="text-gray-600">{evt.timeStr}</span>
                {' · '}
                <span className="text-red-400">{evt.fromModel}</span>
                {' → '}
                <span className="text-emerald-400 font-semibold">{evt.toModel}</span>
                {' · Δ'}
                <span className={evt.delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {evt.delta > 0 ? '+' : ''}{evt.delta.toFixed(2)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionChart;
