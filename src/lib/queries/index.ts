export interface PresetQuery {
  id: string;
  name: string;
  description: string;
  size: "small" | "medium" | "large";
  sql: string;
}

export const PRESET_QUERIES: PresetQuery[] = [
  {
    id: "workouts-per-org",
    name: "Workouts per Region/AO",
    description: "Simple COUNT + GROUP BY: event instances per org (top 20)",
    size: "small",
    sql: `SELECT o.name AS org_name, COUNT(ei.id) AS workout_count
FROM event_instances ei
JOIN orgs o ON ei.org_id = o.id
GROUP BY o.name
ORDER BY workout_count DESC
LIMIT 20`,
  },
  {
    id: "monthly-active-pax",
    name: "Monthly Active PAX",
    description:
      "Multi-table JOIN + date aggregation: unique PAX per month (last 12 months)",
    size: "medium",
    sql: `SELECT
  TO_CHAR(DATE_TRUNC('month', ei.start_date), 'YYYY-MM') AS month,
  COUNT(DISTINCT a.user_id) AS active_pax,
  COUNT(DISTINCT ei.id) AS total_workouts
FROM attendance a
JOIN event_instances ei ON a.event_instance_id = ei.id
WHERE ei.start_date >= NOW() - INTERVAL '12 months'
  AND ei.start_date <= NOW()
GROUP BY DATE_TRUNC('month', ei.start_date)
ORDER BY month DESC`,
  },
  {
    id: "pax-leaderboard",
    name: "PAX Leaderboard (Rolling 90-Day)",
    description:
      "CTE + window functions: top PAX with rolling 90-day post counts and rank",
    size: "large",
    sql: `WITH recent_attendance AS (
  SELECT
    a.user_id,
    ei.start_date,
    COUNT(*) OVER (
      PARTITION BY a.user_id
      ORDER BY ei.start_date
      RANGE BETWEEN INTERVAL '90 days' PRECEDING AND CURRENT ROW
    ) AS rolling_90d_count
  FROM attendance a
  JOIN event_instances ei ON a.event_instance_id = ei.id
  WHERE ei.start_date >= NOW() - INTERVAL '6 months'
    AND ei.start_date <= NOW()
),
latest_counts AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    rolling_90d_count
  FROM recent_attendance
  ORDER BY user_id, start_date DESC
)
SELECT
  u.f3_name,
  lc.rolling_90d_count,
  DENSE_RANK() OVER (ORDER BY lc.rolling_90d_count DESC) AS rank
FROM latest_counts lc
JOIN users u ON lc.user_id = u.id
ORDER BY rank
LIMIT 25`,
  },
];
