export type UserRole = "user" | "admin";

export type UserProfile = {
  name: string;
  city: string;
  platform: "Zomato" | "Swiggy" | "Amazon Flex" | "Blinkit" | "Other";
  avgDailyIncomeInr: number; // user-reported average daily income (INR)
  workingHoursPerDay: number; // hours/day
};

export type User = {
  id: string;
  phone: string;
  createdAt: number;
  role: UserRole;
  profile?: UserProfile;
};

export type WeatherSnapshot = {
  city: string;
  temperatureC: number;
  heatIndex: number; // derived, same unit scale as temperatureC
  rainProbability: number; // 0..1
  rainfallMm: number; // per hour (mock)
  aqi: number; // 0..300
  pollutionLevel: number; // 0..200+
};

export type TriggerReason = {
  rainfallExceeded: boolean;
  temperatureExceeded: boolean;
  aqiExceeded: boolean;
  rainfallThresholdMm: number;
  temperatureThresholdC: number;
  aqiThreshold: number;
};

export type FraudFlag =
  | "NO_WEATHER_MATCH"
  | "MULTIPLE_CLAIMS_SHORT_WINDOW"
  | "LOCATION_MISMATCH";

export type Policy = {
  id: string;
  userId: string;
  weekKey: string; // ISO week key
  createdAt: number;
  weeklyPremiumInr: number; // weekly only
  coveragePercent: number; // % of lost income to cover
  active: boolean;
  lastRiskScore: number; // 0..100 used at generation time
};

export type Claim = {
  id: string;
  userId: string;
  createdAt: number;
  weekKey: string;
  status: "initiated" | "paid";
  trigger: TriggerReason;
  weatherSnapshot?: WeatherSnapshot; // optionally omitted to test fraud rule
  incomeLossInr: number;
  payoutInr: number;
  paymentMethod: "UPI_MOCK";
  fraudFlags: FraudFlag[];
};

export type OtpRecord = {
  otp: string; // 6 digits
  expiresAt: number;
  attempts: number;
};

export type SessionRecord = {
  userId: string;
  expiresAt: number;
};

export type RiskSummary = {
  riskScore: number; // 0..100
  weeklyPremiumInr: number; // 20..100
  coveragePercent: number; // 40..90
  cityRiskIndex: number; // normalized 0..1
};

export type DashboardTimelinePoint = {
  dayLabel: string;
  earningsBeforeInr: number;
  earningsAfterDisruptionInr: number;
  disruptionLabel: string;
};

