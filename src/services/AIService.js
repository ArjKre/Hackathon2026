// Rule-based AI engine — fully offline, zero latency.
// Combines location risk + time-of-day + movement + crime rate into a
// dynamic score, insight text, and smart SOS gate.

function getTimeScore(hour) {
  if (hour >= 6 && hour < 9)   return 85;
  if (hour >= 9 && hour < 17)  return 95;
  if (hour >= 17 && hour < 20) return 75;
  if (hour >= 20 && hour < 22) return 55;
  if (hour >= 22)              return 35;
  return 25; // 0-6
}

function getMovementScore(accelMag, gyroMag) {
  let score;
  if (accelMag < 11)       score = 80;
  else if (accelMag < 15)  score = 90;
  else if (accelMag < 25)  score = 70;
  else                     score = 30;
  if (gyroMag > 3) score = Math.max(score - 15, 10);
  return score;
}

function getCrimeScore(crimeRate) {
  if (crimeRate < 10)  return 90;
  if (crimeRate < 30)  return 70;
  if (crimeRate < 60)  return 45;
  return 20;
}

function getAlertLevel(dynamicScore) {
  if (dynamicScore >= 70) return 'none';
  if (dynamicScore >= 50) return 'low';
  if (dynamicScore >= 30) return 'medium';
  return 'high';
}

function buildInsight(dynamicScore, hour, riskLabel, crimeRate, movementLabel, area) {
  if (dynamicScore < 30) {
    return {
      insight: `High-risk conditions detected in ${area}.`,
      suggestion: 'Move to a busier, well-lit street immediately.',
    };
  }
  if (hour >= 22 && riskLabel !== 'low') {
    return {
      insight: `Late-night travel in a ${riskLabel}-risk area.`,
      suggestion: 'Stay on main roads. Avoid shortcuts.',
    };
  }
  if (crimeRate > 40 && hour >= 20) {
    return {
      insight: `Elevated crime rate after dark in ${area}.`,
      suggestion: 'Consider calling a contact before continuing.',
    };
  }
  if (movementLabel === 'Fast' && riskLabel === 'high') {
    return {
      insight: `Fast movement through a high-risk zone.`,
      suggestion: 'Slow down and stay visible. Alert someone.',
    };
  }
  if (hour >= 17 && riskLabel === 'medium') {
    return {
      insight: `Evening hours in a moderate-risk area.`,
      suggestion: 'Prefer lit main roads. Police station nearby.',
    };
  }
  if (dynamicScore >= 70) {
    return {
      insight: `${area} is a low-risk zone right now.`,
      suggestion: 'Conditions look safe. Continue your route.',
    };
  }
  return {
    insight: `Monitoring your surroundings in ${area}.`,
    suggestion: 'Stay aware of your environment.',
  };
}

// Returns { insight, suggestion, alertLevel, dynamicScore }
function analyzeRisk({ riskLabel = 'low', staticScore = 80, crimeRate = 0, hour, movementLabel = 'Steady', accelMag = 9.81, gyroMag = 0, area = 'this area' }) {
  const h = hour ?? new Date().getHours();

  const timeScore     = getTimeScore(h);
  const movementScore = getMovementScore(accelMag, gyroMag);
  const crimeScore    = getCrimeScore(crimeRate);

  const dynamicScore = Math.round(
    staticScore   * 0.40 +
    timeScore     * 0.25 +
    movementScore * 0.20 +
    crimeScore    * 0.15,
  );

  const alertLevel = getAlertLevel(dynamicScore);
  const { insight, suggestion } = buildInsight(dynamicScore, h, riskLabel, crimeRate, movementLabel, area);

  return { insight, suggestion, alertLevel, dynamicScore };
}

async function generateAIInsights(data) {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  // Rule-based fallback if no API key
  const baseResult = analyzeRisk(data);

  if (!apiKey) {
    console.log('[AIService] No OpenAI key found, using rule-based fallback.');
    return baseResult;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert personal safety assistant for women in Bengaluru. Given the current safety data, provide a concise one-sentence insight and a one-sentence suggestion. Keep it practical, calm, and actionable. Return as JSON: {"insight": "...", "suggestion": "..."}'
          },
          {
            role: 'user',
            content: `Area: ${data.area}, Safety Score: ${baseResult.dynamicScore}/100, Crime Rate: ${data.crimeRate}%, Time: ${data.hour || new Date().getHours()}:00, Movement: ${data.movementLabel || (data.accelMag > 15 ? 'Fast' : 'Steady')}.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI Error: ${response.status}`);

    const json = await response.json();
    const aiContent = JSON.parse(json.choices[0].message.content);

    return {
      ...baseResult,
      insight: aiContent.insight,
      suggestion: aiContent.suggestion,
    };
  } catch (error) {
    console.warn('[AIService] OpenAI call failed, falling back:', error.message);
    return baseResult;
  }
}

// Returns { anomalyType, shouldAlert, confidence }
function analyzeMovement(sensorWindow) {
  if (!sensorWindow || sensorWindow.length < 5) {
    return { anomalyType: 'unknown', shouldAlert: true, confidence: 0.5 };
  }

  const mags = sensorWindow.map(r => r.accelMag);
  const gyros = sensorWindow.map(r => r.gyroMag);
  const n = mags.length;

  const accelMean = mags.reduce((a, b) => a + b, 0) / n;
  const accelMax  = Math.max(...mags);
  const accelStdDev = Math.sqrt(mags.reduce((sum, v) => sum + (v - accelMean) ** 2, 0) / n);
  const gyroMean  = gyros.reduce((a, b) => a + b, 0) / n;
  const spikeCount = mags.filter(v => v > 20).length;

  const tail = mags.slice(-Math.min(20, n));
  const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;

  // Phone dropped: single big spike then returns to normal quickly
  if (accelMax > 35 && tailMean < 12) {
    return { anomalyType: 'phone-dropped', shouldAlert: false, confidence: 0.85 };
  }

  // Running: sustained high accel, rhythmic (low std dev), calm rotation
  if (accelMean > 15 && accelStdDev < 4 && gyroMean < 2) {
    return { anomalyType: 'running', shouldAlert: false, confidence: 0.80 };
  }

  // Fall: big spike then near-zero (person on ground)
  if (accelMax > 25 && tailMean < 6) {
    return { anomalyType: 'fall', shouldAlert: true, confidence: 0.90 };
  }

  // Struggle: multiple spikes + erratic rotation
  if (spikeCount > 4 && gyroMean > 2.5) {
    return { anomalyType: 'struggle', shouldAlert: true, confidence: 0.88 };
  }

  // Normal walking/stationary
  if (accelMean >= 9 && accelMean <= 13 && accelStdDev < 3) {
    return { anomalyType: 'normal', shouldAlert: false, confidence: 0.90 };
  }

  return { anomalyType: 'unknown', shouldAlert: true, confidence: 0.50 };
}

export default { analyzeRisk, generateAIInsights, analyzeMovement };
