import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

// ─── Gauge bar ───────────────────────────────────────────────────────────────
export function SensorGauge({label, value, maxValue, color, unit = ''}) {
  const pct = Math.min(Math.abs(value) / maxValue, 1);
  // Lerp toward red as it fills
  const r = Math.round(59 + (239 - 59) * pct);
  const g = Math.round(130 + (68 - 130) * pct);
  const b = Math.round(246 + (68 - 246) * pct);
  const barColor = `rgb(${r},${g},${b})`;

  return (
    <View style={gaugeStyles.row}>
      <View style={gaugeStyles.labelRow}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, {color}]}>
          {value.toFixed(2)}{unit}
        </Text>
      </View>
      <View style={gaugeStyles.track}>
        <View style={[gaugeStyles.fill, {width: `${pct * 100}%`, backgroundColor: barColor}]} />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  row: {marginBottom: 10},
  labelRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5},
  label: {color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 0.8, fontWeight: '500'},
  value: {fontSize: 11, fontWeight: '700'},
  track: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: 3},
});

// ─── Radar ───────────────────────────────────────────────────────────────────
export function RadarWidget({accelMag, gyroMag}) {
  const SIZE = 160;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const MAX_R = SIZE / 2 - 8;

  const rings = [1, 2, 3, 4];

  const accelR = Math.min(accelMag / 30, 1) * MAX_R;
  const gyroR = Math.min(gyroMag / 10, 1) * MAX_R;

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {/* Rings */}
      {rings.map(i => (
        <Circle
          key={i}
          cx={CX} cy={CY}
          r={(MAX_R * i) / 4}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
          fill="none"
        />
      ))}
      {/* Axes */}
      <Line x1={CX} y1={CY - MAX_R} x2={CX} y2={CY + MAX_R} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      <Line x1={CX - MAX_R} y1={CY} x2={CX + MAX_R} y2={CY} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />

      {/* Accel ring */}
      {accelR > 2 && (
        <>
          <Circle cx={CX} cy={CY} r={accelR} fill="rgba(59,130,246,0.15)" />
          <Circle cx={CX} cy={CY} r={accelR} fill="none" stroke="#3B82F6" strokeWidth={1.5} />
        </>
      )}
      {/* Gyro ring */}
      {gyroR > 2 && (
        <>
          <Circle cx={CX} cy={CY} r={gyroR} fill="rgba(139,92,246,0.12)" />
          <Circle cx={CX} cy={CY} r={gyroR} fill="none" stroke="#8B5CF6" strokeWidth={1.5} />
        </>
      )}
      {/* Center dot */}
      <Circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.5)" />
    </Svg>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
export function Sparkline({values, width}) {
  const HEIGHT = 60;
  const MAX_VAL = 30;
  const step = width / Math.max(values.length - 1, 1);

  const points = values.map((v, i) => ({
    x: i * step,
    y: HEIGHT - (Math.min(v / MAX_VAL, 1)) * HEIGHT,
  }));

  if (points.length < 2) return null;

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const fillPath =
    `M${points[0].x.toFixed(1)},${HEIGHT} ` +
    points.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L${points[points.length - 1].x.toFixed(1)},${HEIGHT} Z`;

  // Threshold line at 25 m/s²
  const thresholdY = HEIGHT - (25 / MAX_VAL) * HEIGHT;

  return (
    <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
      <Defs>
        <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.25" />
          <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={fillPath} fill="url(#sparkGrad)" />
      <Path d={linePath} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line
        x1={0} y1={thresholdY}
        x2={width} y2={thresholdY}
        stroke="rgba(239,68,68,0.4)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </Svg>
  );
}