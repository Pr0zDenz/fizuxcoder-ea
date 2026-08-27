//+------------------------------------------------------------------+
//|                                   3 Serangkai UNIVERSAL EA v13.92|
//|                                      Copyright 2026, Fizu xCoder |
//|                                                                  |
//|         + CLUSTERED NEWS UPDATE: Evaluates multiple news events  |
//|           released at the same time to detect "MIXED" sentiment. |
//|         + TOTAL ROI: Scans entire account history for ALL closed |
//|           trades to provide accurate Total Growth.               |
//|         + DASHBOARD SYNC: EA natively reads the exact High/Med   |
//|           /Low toggle filters broadcasted by the News Calendar.  |
//|         + CENT ACCOUNT FAILSAFE: Prevents zero-divide crashes.   |
//|         + DYNAMIC FIBO RISK ENGINE: Dynamic SL/TP/Lot sizing.    |
//|         + 2/3 MTF SYNC: Evaluates H1, H4, and D1 trends.         |
//|                                                                  |
//|         ====== MARKOV LOGIC NETWORK INTEGRATION ======           |
//|         + MLN ENGINE BRIDGE: EA communicates with Python Markov  |
//|           Logic Network via local JSON WebRequests.              |
//|         + 17-PILLAR SYNC: Mathematically exports exact UI colors |
//|           (-1, 0, 1) directly to the MLN for scoring.            |
//|         + LEARNING FEEDBACK: Sends P/L to Python Brain.          |
//|                                                                  |
//|         ====== SAFE FIBO TP ENGINE & UI ALIGNMENT ======         |
//|         + DEDICATED ANCHORS: Separated Safe TP Fractal Strength. |
//|         + ORPHAN SWEEPER UPGRADE: EA instantly deletes Limit     |
//|           orders the moment the main position hits TP.           |
//|                                                                  |
//|         ====== MODULAR 3-TIER LAYOUT ======                      |
//|         + SYSTEM STATUS BAR: Merged Header, Time, & API Status.  |
//|         + HUD CARDS: 3 distinct modular zones (Finance, Time,    |
//|           and Safe TP Execution). Added Green Filled ROI Badge.  |
//|         + MATRIX GRID: Pillars dynamically Right-Aligned.        |
//|                                                                  |
//|         ====== V13.90 HEDGED BASKET CLOSURE FIX ======           |
//|         + CLOSE BY DIRECTION: Added 'Close_By_Direction' toggle. |
//|           When a Safe TP is hit, the EA will now ONLY close the  |
//|           positions/orders matching that specific direction (Buy |
//|           or Sell), leaving counter-trend baskets safely running.|
//|         + PULLBACK BYPASS: 'Allow_Counter_Trend' toggle allows   |
//|           EA to execute pullback setups against D1 Trend Block.  |
//|         + CLOUDFLARE MASTER SERVER: Retires legacy ngrok routing |
//|           for the current authenticated HTTPS environment.        |
//|         + Y10 PROVIDER DIAGNOSTICS: Logs server macro/provider    |
//|           status when the safe local fallback remains in use.     |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Fizu xCoder"
#property version   "13.92"
#property strict

#include <JAson\JAson.mqh>
#include <Trade\Trade.mqh>
#include <Trade\SymbolInfo.mqh>

#define TRADAYS_NO_VALUE -9223372036854775808
#define FRED_BASE_URL "https://api.stlouisfed.org" 

#resource "\\Images\\fizu_logo.bmp"

CTrade trade;

//--- SNR Enums & Structs
enum ENUM_LINE_STATE { STATE_ACTIVE = 0, STATE_BROKEN = 1 };
enum ENUM_LEVEL_TYPE { TYPE_SUPPORT = 0, TYPE_RESISTANCE = 1 };

struct SLevel {
   double price; 
   double price_body; 
   datetime time; 
   datetime time_broken;     
   ENUM_LEVEL_TYPE type; 
   ENUM_TIMEFRAMES tf; 
   ENUM_LINE_STATE state; 
   int rejections; 
   string name;
};

//--- SNR Global Variables
SLevel m_levels[];
int m_level_count = 0;
double m_point;

//--- Input Parameters
input string InpSepMLN = "===== MARKOV LOGIC (PYTHON BRIDGE) =====";
input string MLN_Predict_URL = "https://signal.fizuxc0der.uk/mln_predict";
input string MLN_Feedback_URL = "https://signal.fizuxc0der.uk/mln_feedback";
input string License_Activate_URL = "https://signal.fizuxc0der.uk/license/activate";
input string Macro_Trigger_URL = "https://signal.fizuxc0der.uk/trigger_macro";
input string License_ID = "PROD-TEST-230069105";                  // Customer license identifier
input string License_Activation_Code = "";   // One-time code from the vendor
input string License_Account_Number = "";    // Blank = current MT5 account
input string Customer_API_Key = "";          // Optional: paste the issued customer key
input bool Force_License_Reactivation = false; // Set true once after yearly renewal

input double MLN_Min_Probability = 0.80; 
input int MLN_Refresh_Seconds = 5;

input string InpSepDT3 = "===== DT3 ZIGZAG SETTINGS =====";
input int DT3_Depth = 5;
input ENUM_TIMEFRAMES DT3_MacroTimeframe = PERIOD_H4;

input string InpSepFMCBR = "===== FMCBR CORE SETTINGS =====";
input int Core_Fractal_Strength = 19; 

// --- V13.90 COUNTER TREND & HEDGING CONTROL ---
input string InpSepCT = "===== COUNTER-TREND PULLBACK =====";
input bool Allow_Counter_Trend = false;    // Safer default for a 500 USD account
input bool Close_By_Direction  = true;     // True: TP closes ONLY its specific direction

input string InpSepSafeTP = "===== SAFE FIBO TP ENGINE =====";
input int    SafeTP_Fractal_Strength = 11;    
input bool   Use_Fibo_TP        = true;       
input bool   Use_1272_Target    = true;       
input bool   Compensate_Spread  = true;       
input double Min_TP_Profit_USD  = 5.0;       // 500 USD preset       

input string InpSepAPI = "===== TWELVE DATA API (ETF PROXY) =====";
input string TwelveData_API_Key = ""; // Optional local fallback only; production provider credentials belong on MasterServer.
input int API_Idle_Refresh_Minutes = 15;
input int API_Active_Refresh_Seconds = 30;

input string InpSepAlpha = "===== ALPHA VANTAGE API (SENTIMENT) =====";
input string AlphaVantage_API_Key = ""; // Optional local fallback only; production provider credentials belong on MasterServer.
input double Sentiment_Threshold = 0.15; 

input string InpSepFRED = "===== FRED API (INFLATION/MACRO) =====";
input string FRED_API_Key = ""; // Optional local fallback only; production provider credentials belong on MasterServer.

input string InpSepTRADAYS = "===== TRADAYS NATIVE CALENDAR =====";
input int Calendar_Refresh_Seconds = 30;

input string InpSepXAU = "===== GOLD (XAU) POINT SETTINGS =====";
input int XAU_StopLossPoints = 0;       
input int XAU_TakeProfitPoints = 0;
input int XAU_Min_TP_Distance = 0;      
input int XAU_LayerSpacingPoints = 100;
input int XAU_BE_TriggerPoints = 0;
input int XAU_BE_BufferPoints = 0;
input int XAU_BE_TrailingStep = 0;

input string InpSepUS30 = "===== DOW JONES (US30) POINT SETTINGS =====";
input int US30_StopLossPoints = 8000;
input int US30_TakeProfitPoints = 18000;
input int US30_Min_TP_Distance = 3000;    
input int US30_LayerSpacingPoints = 1800;
input int US30_BE_TriggerPoints = 30000;
input int US30_BE_BufferPoints = 20000;
input int US30_BE_TrailingStep = 30000;

input string InpSepBTC = "===== BITCOIN (BTC) POINT SETTINGS =====";
input int BTC_StopLossPoints = 15000;      
input int BTC_TakeProfitPoints = 45000;
input int BTC_Min_TP_Distance = 30000;  
input int BTC_LayerSpacingPoints = 15000;
input int BTC_BE_TriggerPoints = 10000;
input int BTC_BE_BufferPoints = 8000;
input int BTC_BE_TrailingStep = 20000;

input string InpSep1 = "===== CORE STRATEGY SETTINGS =====";
input string API_DXY_Symbol = "UUP";
input string API_Y10_Symbol = "IEF";
input bool Is_Y10_Inverse_ETF = true;
input int CCIPeriod = 23;
input int CCIOversold = -100;
input int CCIOverbought = 100;
input ENUM_TIMEFRAMES BOSTimeframe = PERIOD_H4;

input string InpSepPAP = "===== PILLAR 2: PAP NOISE FILTER =====";
input int Min_Asset_Stable_Seconds = 60; 
input int Min_DXY_Stable_Seconds = 60;   

input string InpSepP3 = "===== PILLAR 3: SNR ENGINE + 4X VOL =====";
input int TP_Proximity_Buffer = 200;      
input int SNR_Lookback = 1000;     
input int SNR_SwingBars = 3;        
input int SNR_MaxLevels = 100;
input int SNR_BreakoutBuffer = 30;       
input bool ShowRBS_SBR = false;     
input double Min_Volume_Percent = 80.0;     
input int Verdict_Approval_Score = 10;

input string InpSepRM = "===== RISK & LAYERING =====";
input double RiskPercent = 1;          // Conservative 500 USD preset
input int TotalLayers = 5;             // One order; prevents layered risk multiplication
input int MaxActiveBaskets = 2;          // One basket at a time
input int Hanyut_Buffer_Points = 400;   
input bool UseBreakEven = false;
input bool Is_Cent_Account = false;

input string InpSepBail = "===== EMERGENCY BAILOUT =====";
input bool UseBailoutSystem = false;
input int EmergencyCloseScore = 3;

input string InpSepUI = "===== DASHBOARD UI SETTINGS =====";
input double UI_Scale = 1.0;
input int    PanelX = 20;              
input int    PanelY = 20;
input color  BgColor = C'15,15,20';     
input color  BorderColor = C'40,40,50';

input string InpSepHist = "===== TRADE HISTORY (ROI) SETTINGS =====";
input bool UseCustomHistoryDates = true;                 
input datetime CustomStartDate = D'2026.08.13 00:00';     
input datetime CustomEndDate = D'2026.12.31 23:59';       

#define S(v) (int)MathRound((v) * UI_Scale)
#define F(v) (int)MathMax(1, MathRound((v) * UI_Scale))

input string InpSep3 = "===== SYMBOLS & MISC =====";
input string Broker_DXY_Symbol = "";        
input int MagicNumber = 123456;        
input string GVPrefix = "FFCal_";
input bool AutoTradeExecution = false;     // Enable only after demo validation
input bool EnableAutoScreenshots = true; 

//--- Universal Active Variables
string act_asset_name = "", act_dash_prefix = "", act_dxy_symbol = "", current_regime = "BALANCED"; 
int act_SL = 0, act_TP = 0, act_Min_TP_Dist = 0, act_LayerSpacing = 0, act_BE_Trigger = 0, act_BE_Buffer = 0, act_BE_Trail = 0;
bool is_minimized = false, is_api_active_mode = false;
double api_DXY_open = 0, api_DXY_live = 0, api_y10_open = 0, api_y10_live = 0;
int api_inf_result = 0, api_pol_result = 0, g_score_b = 0, g_score_s = 0;
string api_td_stat = "WAIT", api_cal_stat = "WAIT", api_av_stat = "WAIT", api_fr_stat = "WAIT";
string gh_clock_str = "Sunday, 1 Jan 2026 ● 00:00:00 MYT", gh_count_str = "Next Golden Hour in 0h 0m 0s", gh_desc_str = "Validate all pillars before executing at...";
bool is_gh_9 = false, is_gh_13 = false, is_gh_21 = false;
int active_target_gh = -1, state_inf = 0, state_pol = 0; 
string str_inf = "[API] AUTO", str_pol = "[API] AUTO";
color col_inf = C'40,40,40', col_pol = C'40,40,40';

string synth_pairs_inv[] = {"EURUSD", "GBPUSD", "AUDUSD"};
string synth_pairs_dir[] = {"USDJPY", "USDCAD", "USDCHF"};

string p1_news_str="WAITING", p1_asset_str="WAITING", p1_DXY_str="WAITING", p1_y10_str="WAITING";
color p1_news_col=clrGray, p1_asset_col=clrGray, p1_DXY_col=clrGray, p1_y10_col=clrGray;
string p2_warna_str="WAITING", p2_h1_str="WAITING", p2_h4_str="WAITING", p2_d1_str="WAITING", p2_rank_str="WAITING";
color p2_warna_col=clrGray, p2_h1_col=clrGray, p2_h4_col=clrGray, p2_d1_col=clrGray, p2_rank_col=clrGray;
string p3_op_str="WAITING", p3_snd_str="WAITING", p3_cci_str="WAITING", p3_sig_str="WAITING", p3_adr_str="WAITING", p3_4x_str="WAITING";
color p3_op_col=clrGray, p3_snd_col=clrGray, p3_cci_col=clrGray, p3_sig_col=clrGray, p3_adr_col=clrGray, p3_4x_col=clrGray;

string v_verdict_str = "Awaiting MLN Engine...";
color  v_verdict_col = clrGold;
string v_score_b = "0", v_score_s = "0";
double mln_prob_buy = 0.0, mln_prob_sell = 0.0;
string exec_signal = "WAITING";

datetime last_mln_fetch = 0, last_feedback_time = 0, last_api_fetch = 0, api_cooldown_until = 0, last_bar_time = 0;
string g_customer_api_key = "";
string g_last_mln_y10_status = "";

double g_fibo_hanyut = 0, g_fibo_tp1 = 0, g_fibo_tp2 = 0, g_fibo_tp3 = 0, g_fibo_tamak = 0, global_active_tp = 0;
string active_basket_tp_label = "WAITING";

int g_active_bos = -1, h_cci, h_bulls, h_bears, h_zz, h_atr;
int h_fmcbr_curr, h_fmcbr_h4, h_fmcbr_d1;

int h_safetp_curr;
ENUM_TIMEFRAMES htf_list[] = {PERIOD_M5, PERIOD_M15, PERIOD_M30, PERIOD_H1, PERIOD_H4, PERIOD_D1};
int htf_safetp_handles[6];

//--- Forward Declarations
void InitGUI(); 
bool EnsureCustomerLicense();
 
void UpdateGUI(); 
void UpdatePillars(); 
bool CheckEntry(); 
int  GetTotalOrders();
void SendMLNFeedback(); 
void AutoDetectSymbol(); 
double GetBufferValue(int handle, int buffer_num, int shift);
int  GetSyntheticUSDTrend(ENUM_TIMEFRAMES tf); 
int  GetDT3Signal();
void FetchTwelveData(); 
void FetchNativeCalendarNews(); 
double FetchFREDData(string series_id); 
void FetchAllFREDData(); 
void FetchAlphaVantageSentiment();
bool DetectLevels(ENUM_TIMEFRAMES tf, int lookback, int max_levels); 
void UpdateManualStates();
void DrawRect(string name, int x, int y, int w, int h, color bg, color border, int zorder=0);
void DrawLabel(string name, int x, int y, string text, int size, color col, bool bold=false, int anchor=0);
void DrawButton(string name, int x, int y, int w, int h, string text, int size, color bg, color fg, int zorder=20);
void DrawBitmap(string name, int x, int y, string file, int zorder=5);
void GroupLevels(SLevel &levels[], int &count, double threshold);
void CheckBreakouts(SLevel &levels[], int count, const double &close[], const datetime &time[]);
void AddLevels(SLevel &levels[], int count, int max_levels);
int  GetTrend(string sym, ENUM_TIMEFRAMES tf); 
void TakeTradeScreenshots(string sig); 
void ManageBreakEvenAndTrailing(); 
void ManageEmergencyClose();
void ManageDynamicFiboTP(); 
void CheckNewsTrigger(); 
void PingPythonForMacro(); 
void CleanupOrphanedOrders(); 
double GetBasketBreakEven(long target_type);
void DrawSafeTPLine(double price); 
void DrawSafeTPOrigin(datetime t);
double GetExpectedProfitAtPrice(double target_price);
bool GetExtremeFiboTarget(int handle, int trend, double min_req_profit, double &best_tp, string &tp_label, datetime &best_time, ENUM_TIMEFRAMES tf);

string LicenseCacheFileName() {
   return "3S_license_" + License_ID + ".key";
}

bool ReadCachedCustomerKey(string &key) {
   key = "";
   if(StringLen(License_ID) == 0) return false;
   int handle = FileOpen(LicenseCacheFileName(), FILE_READ | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE) return false;
   key = FileReadString(handle);
   FileClose(handle);
   return StringLen(key) > 0;
}

bool WriteCachedCustomerKey(string key) {
   int handle = FileOpen(LicenseCacheFileName(), FILE_WRITE | FILE_TXT | FILE_COMMON | FILE_ANSI);
   if(handle == INVALID_HANDLE) return false;
   FileWriteString(handle, key);
   FileClose(handle);
   return true;
}

bool EnsureCustomerLicense() {
   g_customer_api_key = Customer_API_Key;
   if(!Force_License_Reactivation && StringLen(g_customer_api_key) == 0)
      ReadCachedCustomerKey(g_customer_api_key);

   if(StringLen(g_customer_api_key) > 0) return true;
   if(StringLen(License_ID) == 0 || StringLen(License_Activation_Code) == 0) {
      Print("3S EA: Provide License_ID and License_Activation_Code, or Customer_API_Key.");
      return false;
   }

   string account = License_Account_Number;
   if(StringLen(account) == 0) account = IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN));
   string install_id = MQLInfoString(MQL_PROGRAM_NAME) + "-" + IntegerToString((long)AccountInfoInteger(ACCOUNT_LOGIN));
   string payload = StringFormat("{\"license_id\":\"%s\",\"activation_code\":\"%s\",\"account_number\":\"%s\",\"install_id\":\"%s\"}", License_ID, License_Activation_Code, account, install_id);
   char post[], result[];
   string headers = "Content-Type: application/json\r\n", response_headers;
   StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
   int status = WebRequest("POST", License_Activate_URL, headers, 10000, post, result, response_headers);
   if(status != 200) {
      PrintFormat("3S EA: License activation failed. HTTP=%d Error=%d", status, GetLastError());
      return false;
   }

   CJAVal response;
   if(!response.Deserialize(CharArrayToString(result))) {
      Print("3S EA: License server returned invalid JSON.");
      return false;
   }
   g_customer_api_key = response["api_key"].ToStr();
   if(StringLen(g_customer_api_key) == 0) {
      Print("3S EA: License server did not return a customer API key.");
      return false;
   }
   if(!WriteCachedCustomerKey(g_customer_api_key))
      Print("3S EA: Warning: customer key was activated but could not be cached locally.");
   PrintFormat("3S EA: License activated until %s.", response["expiry"].ToStr());
   return true;
}

//+------------------------------------------------------------------+
//| INITIALIZATION                                                   |
//+------------------------------------------------------------------+
int OnInit() {
   AutoDetectSymbol();
   if(!EnsureCustomerLicense()) {
      Print("3S EA: License activation failed. Automated operation is blocked.");
      return INIT_FAILED;
   }
 
   m_point = SymbolInfoDouble(_Symbol, SYMBOL_POINT); 
   trade.SetExpertMagicNumber(MagicNumber);
   
   if(GlobalVariableCheck("3S_State_Inf")) state_inf = (int)GlobalVariableGet("3S_State_Inf");
   if(GlobalVariableCheck("3S_State_Pol")) state_pol = (int)GlobalVariableGet("3S_State_Pol");
   
   h_cci = iCCI(_Symbol, PERIOD_CURRENT, CCIPeriod, PRICE_TYPICAL); 
   h_bulls = iBullsPower(_Symbol, PERIOD_CURRENT, 13); 
   h_bears = iBearsPower(_Symbol, PERIOD_CURRENT, 13);
   h_atr = iATR(_Symbol, PERIOD_D1, 10); 
   
   h_zz = iCustom(_Symbol, BOSTimeframe, "DT3-ZigZag-LauerX", DT3_Depth, DT3_MacroTimeframe);
   if(h_zz == INVALID_HANDLE) Print("WARNING: Failed to load 'DT3-ZigZag-LauerX.ex5'! Ensure file is in MQL5/Indicators.");
   
   h_fmcbr_curr = iCustom(_Symbol, BOSTimeframe, "FMCBR - Fractal_fixed", false, Core_Fractal_Strength);
   if(h_fmcbr_curr == INVALID_HANDLE) Print("WARNING: Failed to load 'FMCBR - Fractal_fixed.ex5'! Ensure file is in MQL5/Indicators.");
   h_fmcbr_h4   = iCustom(_Symbol, PERIOD_H4, "FMCBR - Fractal_fixed", false, Core_Fractal_Strength);
   h_fmcbr_d1   = iCustom(_Symbol, PERIOD_D1, "FMCBR - Fractal_fixed", false, Core_Fractal_Strength);
   
   
   h_safetp_curr = iCustom(_Symbol, BOSTimeframe, "FMCBR - Fractal_fixed", false, SafeTP_Fractal_Strength);
   for(int i = 0; i < 6; i++) {
       htf_safetp_handles[i] = iCustom(_Symbol, htf_list[i], "FMCBR - Fractal_fixed", false, SafeTP_Fractal_Strength);
   }
   
   last_feedback_time = TimeCurrent(); 
   UpdateManualStates(); 
   
   ObjectsDeleteAll(0, "MLN_"); 
   ObjectsDeleteAll(0, "BTN_"); 
   InitGUI(); 
   EventSetTimer(1); 
   FetchNativeCalendarNews(); 
   
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { 
   ObjectsDeleteAll(0, "MLN_"); 
   ObjectsDeleteAll(0, "BTN_");
   DrawSafeTPLine(0.0);
   DrawSafeTPOrigin(0);
   
   IndicatorRelease(h_cci); 
   IndicatorRelease(h_bulls); 
   IndicatorRelease(h_bears); 
   IndicatorRelease(h_zz);
   
   if(h_fmcbr_curr != INVALID_HANDLE) IndicatorRelease(h_fmcbr_curr); 
   if(h_fmcbr_h4 != INVALID_HANDLE) IndicatorRelease(h_fmcbr_h4); 
   if(h_fmcbr_d1 != INVALID_HANDLE) IndicatorRelease(h_fmcbr_d1);
   if(h_atr != INVALID_HANDLE) IndicatorRelease(h_atr); 
   
   if(h_safetp_curr != INVALID_HANDLE) IndicatorRelease(h_safetp_curr);
   for(int i = 0; i < 6; i++) {
       if(htf_safetp_handles[i] != INVALID_HANDLE) IndicatorRelease(htf_safetp_handles[i]);
   }
   
   EventKillTimer(); 
}

void AutoDetectSymbol() {
   string sym = _Symbol; 
   string upper_sym = sym; 
   StringToUpper(upper_sym);
   
   if(StringFind(upper_sym, "XAU") >= 0 || StringFind(upper_sym, "GOLD") >= 0) { 
       act_asset_name = "GOLD"; act_dash_prefix = "XAU"; 
       act_SL = XAU_StopLossPoints; act_TP = XAU_TakeProfitPoints; act_Min_TP_Dist = XAU_Min_TP_Distance; 
       act_LayerSpacing = XAU_LayerSpacingPoints; act_BE_Trigger = XAU_BE_TriggerPoints; 
       act_BE_Buffer = XAU_BE_BufferPoints; act_BE_Trail = XAU_BE_TrailingStep; 
   } 
   else if(StringFind(upper_sym, "BTC") >= 0 || StringFind(upper_sym, "BITCOIN") >= 0) { 
       act_asset_name = "BTC"; act_dash_prefix = "BTC"; 
       act_SL = BTC_StopLossPoints; act_TP = BTC_TakeProfitPoints; act_Min_TP_Dist = BTC_Min_TP_Distance; 
       act_LayerSpacing = BTC_LayerSpacingPoints; act_BE_Trigger = BTC_BE_TriggerPoints; 
       act_BE_Buffer = BTC_BE_BufferPoints; act_BE_Trail = BTC_BE_TrailingStep; 
   } 
   else if(StringFind(upper_sym, "US30") >= 0 || StringFind(upper_sym, "WS30") >= 0 || StringFind(upper_sym, "DOW") >= 0) { 
       act_asset_name = "US30"; act_dash_prefix = "US30"; 
       act_SL = US30_StopLossPoints; act_TP = US30_TakeProfitPoints; act_Min_TP_Dist = US30_Min_TP_Distance; 
       act_LayerSpacing = US30_LayerSpacingPoints; act_BE_Trigger = US30_BE_TriggerPoints; 
       act_BE_Buffer = US30_BE_BufferPoints; act_BE_Trail = US30_BE_TrailingStep; 
   }
   else { 
       act_asset_name = sym; act_dash_prefix = sym; 
       act_SL = XAU_StopLossPoints; act_TP = XAU_TakeProfitPoints; act_Min_TP_Dist = XAU_Min_TP_Distance; 
       act_LayerSpacing = XAU_LayerSpacingPoints; act_BE_Trigger = XAU_BE_TriggerPoints; 
       act_BE_Buffer = XAU_BE_BufferPoints; act_BE_Trail = XAU_BE_TrailingStep; 
   }
   
   if(Broker_DXY_Symbol != "") { 
       act_dxy_symbol = Broker_DXY_Symbol; 
       SymbolSelect(act_dxy_symbol, true); 
   } 
   else {
       bool found_dxy = false; 
       int total = SymbolsTotal(false);
       for(int i = 0; i < total; i++) {
          string market_sym = SymbolName(i, false); 
          string upper_m = market_sym; 
          StringToUpper(upper_m);
          
          if(StringFind(upper_m, "US30") >= 0 || StringFind(upper_m, "WS30") >= 0) continue;
          if(StringFind(upper_m, "USDX") >= 0 || StringFind(upper_m, "DXY") >= 0 || StringFind(upper_m, "DOLLAR_INDEX") >= 0 || StringFind(upper_m, "USDOLLAR") >= 0 || (StringFind(upper_m, "DX") == 0 && StringLen(upper_m) <= 8)) { 
              act_dxy_symbol = market_sym; 
              SymbolSelect(act_dxy_symbol, true); 
              found_dxy = true; 
              break; 
          }
       }
       if(!found_dxy) act_dxy_symbol = "SYNTHETIC_DXY";
   }
}

//+------------------------------------------------------------------+
//| TICK LOOP & EVENTS (INSTANT EXECUTION ENABLED)                   |
//+------------------------------------------------------------------+
void OnTick() {
   SendMLNFeedback(); 
   UpdatePillars(); 
   UpdateGUI(); 
   
   ManageBreakEvenAndTrailing(); 
   ManageEmergencyClose(); 
   CleanupOrphanedOrders(); 
   
   static datetime last_basket_time = 0;
   
   if (exec_signal == "EXECUTE BUY" || exec_signal == "EXECUTE SELL") {
      if (!AutoTradeExecution) {
         // Silently skip if user turned it off
      } 
      else if (GetTotalOrders() >= (MaxActiveBaskets * TotalLayers)) {
         static datetime last_warn = 0;
         if (TimeCurrent() - last_warn > 60) {
             Print("⚠️ 3S EA: Entry Blocked! MaxActiveBaskets reached. Sila periksa tab 'Trade' untuk memadam ghost pending orders.");
             last_warn = TimeCurrent();
         }
      } 
      else if (iTime(_Symbol, Period(), 0) != last_basket_time) {
         string trigger_sig = exec_signal;
         if (CheckEntry()) { 
             if(EnableAutoScreenshots) TakeTradeScreenshots(trigger_sig); 
             last_basket_time = iTime(_Symbol, Period(), 0); 
         }
      }
   }
   
   ManageDynamicFiboTP();
   
   datetime current_time = iTime(_Symbol, Period(), 0);
   if (current_time != last_bar_time) {
      last_bar_time = current_time; 
   }
}

void OnTimer() {
   FetchTwelveData(); 
   FetchNativeCalendarNews();
   CheckNewsTrigger(); 
   UpdatePillars(); 
   UpdateGUI();
}

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam) {
   if(id == CHARTEVENT_OBJECT_CLICK) {
      if(sparam == "BTN_Toggle") { 
          is_minimized = !is_minimized; 
          ObjectSetInteger(0, sparam, OBJPROP_STATE, false); 
          InitGUI(); 
          UpdateGUI(); 
      }
      if(sparam == "BTN_Inf") { 
          state_inf++; 
          if(state_inf > 2) state_inf = 0; 
          ObjectSetInteger(0, sparam, OBJPROP_STATE, false); 
          UpdateManualStates(); 
          UpdatePillars(); 
          UpdateGUI(); 
      }
      if(sparam == "BTN_Pol") { 
          state_pol++; 
          if(state_pol > 2) state_pol = 0; 
          ObjectSetInteger(0, sparam, OBJPROP_STATE, false); 
          UpdateManualStates(); 
          UpdatePillars(); 
          UpdateGUI(); 
      }
   }
}

//+------------------------------------------------------------------+
//| VISUAL SAFE TP GOLD HIGHLIGHTER ENGINE                           |
//+------------------------------------------------------------------+
void DrawSafeTPLine(double price) {
    string name = "GBUI_SafeTP_Line";
    if(price <= 0.0) { 
        ObjectDelete(0, name); 
        return; 
    }
    
    if(ObjectFind(0, name) < 0) {
        ObjectCreate(0, name, OBJ_HLINE, 0, 0, price);
        ObjectSetInteger(0, name, OBJPROP_COLOR, clrGold);      
        ObjectSetInteger(0, name, OBJPROP_WIDTH, 2);            
        ObjectSetInteger(0, name, OBJPROP_STYLE, STYLE_SOLID);
        ObjectSetInteger(0, name, OBJPROP_BACK, false);         
        ObjectSetString(0, name, OBJPROP_TEXT, " 🎯 LOCKED SAFE TP");
        ObjectSetInteger(0, name, OBJPROP_HIDDEN, false);
    } else { 
        ObjectSetDouble(0, name, OBJPROP_PRICE, price); 
    }
}

void DrawSafeTPOrigin(datetime t) {
    string name = "GBUI_SafeTP_Origin";
    if(t <= 0) { 
        ObjectDelete(0, name); 
        return; 
    }
    
    if(ObjectFind(0, name) < 0) {
        ObjectCreate(0, name, OBJ_VLINE, 0, t, 0);
        ObjectSetInteger(0, name, OBJPROP_COLOR, clrGold);      
        ObjectSetInteger(0, name, OBJPROP_WIDTH, 1);            
        ObjectSetInteger(0, name, OBJPROP_STYLE, STYLE_DOT);
        ObjectSetInteger(0, name, OBJPROP_BACK, true);         
        ObjectSetString(0, name, OBJPROP_TEXT, " 🎯 SAFE TP ORIGIN");
        ObjectSetInteger(0, name, OBJPROP_HIDDEN, false);
        ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
    } else { 
        ObjectSetInteger(0, name, OBJPROP_TIME, t); 
    }
}

double GetExpectedProfitAtPrice(double target_price) {
    double expected_profit = 0.0;
    bool has_positions = false;
    
    for(int i = 0; i < PositionsTotal(); i++) {
        if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
            has_positions = true;
            long pos_type = PositionGetInteger(POSITION_TYPE);
            ENUM_ORDER_TYPE order_type = (pos_type == POSITION_TYPE_BUY) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
            double calc_profit = 0.0;
            
            if(OrderCalcProfit(order_type, _Symbol, PositionGetDouble(POSITION_VOLUME), PositionGetDouble(POSITION_PRICE_OPEN), target_price, calc_profit)) {
                expected_profit += calc_profit + PositionGetDouble(POSITION_SWAP);
            }
        }
    }
    return has_positions ? expected_profit : 0.0;
}

bool GetExtremeFiboTarget(int handle, int trend, double min_req_profit, double &best_tp, string &tp_label, datetime &best_time, ENUM_TIMEFRAMES tf) {
    double best_valid_tp = (trend == 1) ? 999999.0 : 0.0;
    string best_label = "";
    bool found = false;
    
    double spread = 0.0;
    if(trend == -1 && Compensate_Spread) {
        spread = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID);
    }
    
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    
    if(trend == 1) { 
        double mula_up[], tp1_up[], tp2_up[], tp3_up[];
        
        ArraySetAsSeries(mula_up, true); ArraySetAsSeries(tp1_up, true);
        ArraySetAsSeries(tp2_up, true); ArraySetAsSeries(tp3_up, true);
        
        int c1 = CopyBuffer(handle, 8, 0, 1000, mula_up); 
        int c2 = CopyBuffer(handle, 12, 0, 1000, tp1_up);
        int c3 = CopyBuffer(handle, 13, 0, 1000, tp2_up); 
        int c4 = CopyBuffer(handle, 14, 0, 1000, tp3_up);
        
        if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0) {
            int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
            for(int i = 0; i < limit; i++) {
                if(mula_up[i] > 0.0) {
                    datetime mula_time = iTime(_Symbol, tf, i); 
                    for(int k = i; k < MathMin(i + 150, Bars(_Symbol, tf)); k++) {
                        if(MathAbs(iLow(_Symbol, tf, k) - mula_up[i]) < point || MathAbs(iHigh(_Symbol, tf, k) - mula_up[i]) < point) { 
                            mula_time = iTime(_Symbol, tf, k); 
                            break; 
                        }
                    }
                    
                    if(Use_1272_Target && tp1_up[i] > 0.0) {
                        double diff_100 = (tp1_up[i] - mula_up[i]) / 1.618; 
                        double tp_1272 = mula_up[i] + (diff_100 * 1.272);
                        if(tp_1272 < best_valid_tp && GetExpectedProfitAtPrice(tp_1272) >= min_req_profit) { 
                            best_valid_tp = tp_1272; 
                            best_label = "TP 1.272"; 
                            found = true; 
                            best_time = mula_time; 
                        }
                    }
                    
                    if(!found && tp1_up[i] != 0.0 && tp1_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp1_up[i]) >= min_req_profit) { 
                        best_valid_tp = tp1_up[i]; best_label = "TP1 (1.618)"; found = true; best_time = mula_time; 
                    }
                    if(!found && tp2_up[i] != 0.0 && tp2_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp2_up[i]) >= min_req_profit) { 
                        best_valid_tp = tp2_up[i]; best_label = "TP2 (2.618)"; found = true; best_time = mula_time; 
                    }
                    if(!found && tp3_up[i] != 0.0 && tp3_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp3_up[i]) >= min_req_profit) { 
                        best_valid_tp = tp3_up[i]; best_label = "TP3 (4.236)"; found = true; best_time = mula_time; 
                    }
                    break; 
                }
            }
        }
    } else if(trend == -1) { 
        double mula_dn[], tp1_dn[], tp2_dn[], tp3_dn[];
        
        ArraySetAsSeries(mula_dn, true); ArraySetAsSeries(tp1_dn, true);
        ArraySetAsSeries(tp2_dn, true); ArraySetAsSeries(tp3_dn, true);
        
        int c1 = CopyBuffer(handle, 10, 0, 1000, mula_dn); 
        int c2 = CopyBuffer(handle, 15, 0, 1000, tp1_dn);
        int c3 = CopyBuffer(handle, 16, 0, 1000, tp2_dn); 
        int c4 = CopyBuffer(handle, 17, 0, 1000, tp3_dn);
        
        if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0) {
            int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
            for(int i = 0; i < limit; i++) {
                if(mula_dn[i] > 0.0) {
                    datetime mula_time = iTime(_Symbol, tf, i); 
                    for(int k = i; k < MathMin(i + 150, Bars(_Symbol, tf)); k++) {
                        if(MathAbs(iHigh(_Symbol, tf, k) - mula_dn[i]) < point || MathAbs(iLow(_Symbol, tf, k) - mula_dn[i]) < point) { 
                            mula_time = iTime(_Symbol, tf, k); 
                            break; 
                        }
                    }
                    
                    if(Use_1272_Target && tp1_dn[i] > 0.0) {
                        double diff_100 = (mula_dn[i] - tp1_dn[i]) / 1.618; 
                        double tp_1272 = mula_dn[i] - (diff_100 * 1.272);
                        if(tp_1272 > best_valid_tp && GetExpectedProfitAtPrice(tp_1272 + spread) >= min_req_profit) { 
                            best_valid_tp = tp_1272; 
                            best_label = "TP 1.272"; 
                            found = true; 
                            best_time = mula_time; 
                        }
                    }
                    
                    if(!found && tp1_dn[i] != 0.0 && tp1_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp1_dn[i] + spread) >= min_req_profit) { 
                        best_valid_tp = tp1_dn[i]; best_label = "TP1 (1.618)"; found = true; best_time = mula_time; 
                    }
                    if(!found && tp2_dn[i] != 0.0 && tp2_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp2_dn[i] + spread) >= min_req_profit) { 
                        best_valid_tp = tp2_dn[i]; best_label = "TP2 (2.618)"; found = true; best_time = mula_time; 
                    }
                    if(!found && tp3_dn[i] != 0.0 && tp3_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp3_dn[i] + spread) >= min_req_profit) { 
                        best_valid_tp = tp3_dn[i]; best_label = "TP3 (4.236)"; found = true; best_time = mula_time; 
                    }
                    break; 
                }
            }
        }
    }
    
    if(found) { 
        best_tp = best_valid_tp; 
        tp_label = best_label; 
        return true; 
    }
    
    return false;
}

//+------------------------------------------------------------------+
//| 17-PILLAR SCORING ENGINE                                         |
//+------------------------------------------------------------------+
void UpdatePillars() {
   double atr = GetBufferValue(h_atr, 0, 0);
   double day_range = iHigh(_Symbol, PERIOD_D1, 0) - iLow(_Symbol, PERIOD_D1, 0);
   
   string local_regime = "BALANCED";
   double adr_ratio = (atr > 0) ? (day_range / atr) : 1.0;
   
   if(adr_ratio > 1.25) local_regime = "VOLATILE"; 
   else if(adr_ratio < 0.75) local_regime = "QUIET"; 
   
   if(current_regime == "") current_regime = local_regime;

   datetime myt_time = TimeGMT() + (8 * 3600); 
   MqlDateTime dt; 
   TimeToStruct(myt_time, dt);
   
   int current_seconds = dt.hour * 3600 + dt.min * 60 + dt.sec;
   int t9 = 9 * 3600, t13 = 13 * 3600, t21 = 21 * 3600, target_seconds = 0;
   string next_gh = ""; 
   is_gh_9 = false; is_gh_13 = false; is_gh_21 = false; active_target_gh = -1;
   
   if (current_seconds < t9) { target_seconds = t9; next_gh = "9:00 AM"; is_gh_9 = true; active_target_gh = 9; }
   else if (current_seconds < t13) { target_seconds = t13; next_gh = "1:00 PM"; is_gh_13 = true; active_target_gh = 13; }
   else if (current_seconds < t21) { target_seconds = t21; next_gh = "9:00 PM"; is_gh_21 = true; active_target_gh = 21; }
   else { target_seconds = t9 + 86400; next_gh = "9:00 AM"; is_gh_9 = true; active_target_gh = 9; } 
   
   int diff = target_seconds - current_seconds, h = diff / 3600, m = (diff % 3600) / 60, s = diff % 60;
   gh_clock_str = StringFormat("Next Golden Hour in %dh %dm %ds", h, m, s); 
   gh_desc_str  = StringFormat("Validate %d out of 17 pillars before executing at %s MYT", Verdict_Approval_Score, next_gh);

   double current_price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double open_price_d1 = iOpen(_Symbol, PERIOD_D1, 0);
   bool asset_up = (current_price >= open_price_d1);
   
   if (asset_up) { p1_asset_str = "[OK] Meningkat (D1)"; p1_asset_col = clrLime; } 
   else { p1_asset_str = "[OK] Menurun (D1)"; p1_asset_col = clrRed; }

   int dxy_daily_dir_api = 0; 
   if(api_DXY_live > 0 && api_DXY_open > 0) {
      dxy_daily_dir_api = (api_DXY_live >= api_DXY_open) ? 1 : -1;
      if(dxy_daily_dir_api == -1) { p1_DXY_str = "[OK] Menurun (API)"; p1_DXY_col = clrLime; } 
      else { p1_DXY_str = "[OK] Meningkat (API)"; p1_DXY_col = clrRed; }
   } else {
      if(act_dxy_symbol == "SYNTHETIC_DXY") {
         dxy_daily_dir_api = GetSyntheticUSDTrend(PERIOD_D1);
         if(dxy_daily_dir_api == -1) { p1_DXY_str = "[OK] Menurun (Synth)"; p1_DXY_col = clrLime; } 
         else if(dxy_daily_dir_api == 1) { p1_DXY_str = "[OK] Meningkat (Synth)"; p1_DXY_col = clrRed; } 
         else { p1_DXY_str = "WAITING DXY DATA"; p1_DXY_col = clrGray; }
      } 
      else if(act_dxy_symbol != "") {
         double live_dxy = SymbolInfoDouble(act_dxy_symbol, SYMBOL_BID), open_dxy = iOpen(act_dxy_symbol, PERIOD_D1, 0);
         if(live_dxy > 0 && open_dxy > 0) { 
             dxy_daily_dir_api = (live_dxy >= open_dxy) ? 1 : -1; 
             if(dxy_daily_dir_api == -1) { p1_DXY_str = "[OK] Menurun (Broker)"; p1_DXY_col = clrLime; } 
             else { p1_DXY_str = "[OK] Meningkat (Broker)"; p1_DXY_col = clrRed; } 
         } else { p1_DXY_str = "WAITING DXY DATA"; p1_DXY_col = clrGray; }
      }
   }

   g_active_bos = -1; 
   g_fibo_hanyut = 0; g_fibo_tp1 = 0; g_fibo_tp2 = 0; g_fibo_tp3 = 0; g_fibo_tamak = 0;
   
   double p1 = GetBufferValue(h_fmcbr_curr, 6, 0); 
   double p2 = GetBufferValue(h_fmcbr_curr, 7, 0);
   
   bool escalate_to_htf = false; 
   double fibo_diff = 0; 
   string active_tf_str = EnumToString(BOSTimeframe); 
   StringReplace(active_tf_str, "PERIOD_", ""); 
   
   if(p1 > 0 && p2 > 0) {
       fibo_diff = MathAbs(p1 - p2); 
       double curr_tamak = (p1 > p2) ? (p2 + fibo_diff * 6.854) : (p2 - fibo_diff * 6.854);
       
       if(p1 > p2 && current_price >= curr_tamak) escalate_to_htf = true; 
       if(p1 < p2 && current_price <= curr_tamak) escalate_to_htf = true; 
   } else { 
       escalate_to_htf = true; 
   }

   if(escalate_to_htf) {
       p1 = GetBufferValue(h_fmcbr_h4, 6, 0); 
       p2 = GetBufferValue(h_fmcbr_h4, 7, 0); 
       active_tf_str = "H4";
       
       if(p1 > 0 && p2 > 0) {
           fibo_diff = MathAbs(p1 - p2); 
           double h4_tamak = (p1 > p2) ? (p2 + fibo_diff * 6.854) : (p2 - fibo_diff * 6.854);
           
           if((p1 > p2 && current_price >= h4_tamak) || (p1 < p2 && current_price <= h4_tamak)) {
               p1 = GetBufferValue(h_fmcbr_d1, 6, 0); 
               p2 = GetBufferValue(h_fmcbr_d1, 7, 0); 
               active_tf_str = "D1";
           }
       }
   }

   // --- V13.90 COUNTER-TREND PULLBACK BYPASS ---
   if(p1 > 0 && p2 > 0) {
       fibo_diff = MathAbs(p1 - p2); 
       
       if(p1 > p2) { 
           if(asset_up || Allow_Counter_Trend) { 
               g_active_bos = 0; 
               g_fibo_hanyut = p2 - (fibo_diff * 0.5); 
               g_fibo_tp1 = p2 + (fibo_diff * 1.618); 
               g_fibo_tp2 = p2 + (fibo_diff * 2.618); 
               g_fibo_tp3 = p2 + (fibo_diff * 4.236); 
               g_fibo_tamak = p2 + (fibo_diff * 6.854);
               p3_adr_str = StringFormat("[OK] Target Buy Aktif (%s)", active_tf_str); 
               p3_adr_col = clrLime;
           } else { 
               p3_adr_str = "BLOCKED: Fibo Buy vs Trend Sell"; 
               p3_adr_col = clrYellow; 
           }
       } else if(p1 < p2) { 
           if(!asset_up || Allow_Counter_Trend) { 
               g_active_bos = 1; 
               g_fibo_hanyut = p2 + (fibo_diff * 0.5); 
               g_fibo_tp1 = p2 - (fibo_diff * 1.618); 
               g_fibo_tp2 = p2 - (fibo_diff * 2.618); 
               g_fibo_tp3 = p2 - (fibo_diff * 4.236); 
               g_fibo_tamak = p2 - (fibo_diff * 6.854);
               p3_adr_str = StringFormat("[OK] Target Sell Aktif (%s)", active_tf_str); 
               p3_adr_col = clrRed;
           } else { 
               p3_adr_str = "BLOCKED: Fibo Sell vs Trend Buy"; 
               p3_adr_col = clrYellow; 
           }
       }
   } else { 
       p3_adr_str = "Menunggu Breakout/Trend Align..."; 
       p3_adr_col = clrGray; 
   }
      
   int h1_t = (iClose(_Symbol, PERIOD_H1, 0) > iOpen(_Symbol, PERIOD_H1, 0)) ? 1 : -1;
   int h4_t = (iClose(_Symbol, PERIOD_H4, 0) > iOpen(_Symbol, PERIOD_H4, 0)) ? 1 : -1;
   int d1_t = (iClose(_Symbol, PERIOD_D1, 0) > iOpen(_Symbol, PERIOD_D1, 0)) ? 1 : -1;
   int asset_sum = h1_t + h4_t + d1_t;
   
   int dash_DXY_h1 = 0, dash_DXY_h4 = 0, dash_DXY_d1 = 0;
   if(GlobalVariableCheck("3S_Dash_USDX_H1")) { 
       dash_DXY_h1 = (int)GlobalVariableGet("3S_Dash_USDX_H1"); 
       dash_DXY_h4 = (int)GlobalVariableGet("3S_Dash_USDX_H4"); 
       dash_DXY_d1 = (int)GlobalVariableGet("3S_Dash_USDX_D1"); 
   } else { 
      if(act_dxy_symbol == "SYNTHETIC_DXY") { 
          dash_DXY_h1 = GetSyntheticUSDTrend(PERIOD_H1); 
          dash_DXY_h4 = GetSyntheticUSDTrend(PERIOD_H4); 
          dash_DXY_d1 = GetSyntheticUSDTrend(PERIOD_D1); 
      } else if (act_dxy_symbol != "" && SymbolInfoDouble(act_dxy_symbol, SYMBOL_BID) > 0) { 
          dash_DXY_h1 = (iClose(act_dxy_symbol, PERIOD_H1, 0) >= iOpen(act_dxy_symbol, PERIOD_H1, 0)) ? 1 : -1; 
          dash_DXY_h4 = (iClose(act_dxy_symbol, PERIOD_H4, 0) >= iOpen(act_dxy_symbol, PERIOD_H4, 0)) ? 1 : -1; 
          dash_DXY_d1 = (iClose(act_dxy_symbol, PERIOD_D1, 0) >= iOpen(act_dxy_symbol, PERIOD_D1, 0)) ? 1 : -1; 
      }
   }
   
   int dxy_sum = dash_DXY_h1 + dash_DXY_h4 + dash_DXY_d1;
   static int last_asset_maj = 0; 
   static datetime asset_lock_start = 0;
   
   int current_asset_maj = (asset_sum >= 1) ? 1 : (asset_sum <= -1 ? -1 : 0);
   if(current_asset_maj != last_asset_maj || current_asset_maj == 0) { 
       last_asset_maj = current_asset_maj; 
       asset_lock_start = TimeCurrent(); 
   }
   
   int asset_elapsed = (int)(TimeCurrent() - asset_lock_start); 
   bool asset_locked = (asset_elapsed >= Min_Asset_Stable_Seconds && current_asset_maj != 0); 
   bool asset_h1_agrees = (current_asset_maj == h1_t);

   if(current_asset_maj != 0) {
      if(asset_locked && asset_h1_agrees) { 
          p2_h1_str = StringFormat("[OK] %s Locked (2/3 Trend)", act_asset_name); 
          p2_h1_col = (current_asset_maj == 1) ? clrLime : clrRed; 
      }
      else if(asset_locked && !asset_h1_agrees) { 
          p2_h1_str = "Waiting H1 Alignment..."; 
          p2_h1_col = clrYellow; 
      }
      else { 
          p2_h1_str = StringFormat("Locking %s... (%ds/%ds)", act_asset_name, asset_elapsed, Min_Asset_Stable_Seconds); 
          p2_h1_col = clrYellow; 
      }
   } else { 
       p2_h1_str = "Waiting 2/3 Sync..."; 
       p2_h1_col = clrGray; 
   }

   static int last_dxy_direction = 0; 
   static datetime dxy_lock_start = 0;
   int current_dxy_majority = (dxy_sum >= 1) ? 1 : (dxy_sum <= -1 ? -1 : 0);
   
   if(current_dxy_majority != last_dxy_direction || current_dxy_majority == 0) { 
       last_dxy_direction = current_dxy_majority; 
       dxy_lock_start = TimeCurrent(); 
   }
   
   int dxy_elapsed = (int)(TimeCurrent() - dxy_lock_start); 
   bool dxy_locked = (dxy_elapsed >= Min_DXY_Stable_Seconds && current_dxy_majority != 0); 
   bool dxy_h1_agrees = (current_dxy_majority == dash_DXY_h1);

   if(current_dxy_majority != 0) {
      if(dxy_locked && dxy_h1_agrees) { 
          p2_h4_str = "[OK] DXY Locked (2/3 Trend)"; 
          p2_h4_col = (current_dxy_majority == 1) ? clrRed : clrLime; 
      }
      else if(dxy_locked && !dxy_h1_agrees) { 
          p2_h4_str = "Waiting DXY H1 Alignment..."; 
          p2_h4_col = clrYellow; 
      }
      else { 
          p2_h4_str = StringFormat("Locking DXY... (%ds/%ds)", dxy_elapsed, Min_DXY_Stable_Seconds); 
          p2_h4_col = clrYellow; 
      }
   } else { 
       p2_h4_str = "Waiting DXY 2/3 Sync..."; 
       p2_h4_col = clrGray; 
   }

   bool gold_valid_up = (current_asset_maj == 1 && asset_locked && h1_t == 1);
   bool gold_valid_dn = (current_asset_maj == -1 && asset_locked && h1_t == -1);
   bool dxy_valid_up = (current_dxy_majority == 1 && dxy_locked && dash_DXY_h1 == 1);
   bool dxy_valid_dn = (current_dxy_majority == -1 && dxy_locked && dash_DXY_h1 == -1);

   if (gold_valid_up && dxy_valid_dn) { 
       p2_warna_str = StringFormat("[OK] %s Hijau + DXY Merah", act_asset_name); 
       p2_warna_col = clrLime; 
   } 
   else if (gold_valid_dn && dxy_valid_up) { 
       p2_warna_str = StringFormat("[OK] %s Merah + DXY Hijau", act_asset_name); 
       p2_warna_col = clrRed; 
   } 
   else { 
       p2_warna_str = "MIXED COLOR"; 
       p2_warna_col = clrYellow; 
   }

   if(gold_valid_up && dxy_valid_dn) { 
       p2_d1_str = StringFormat("[OK] Valid (%s Up, DXY Dn)", act_asset_name); 
       p2_d1_col = clrLime; 
   } 
   else if(gold_valid_dn && dxy_valid_up) { 
       p2_d1_str = StringFormat("[OK] Valid (%s Dn, DXY Up)", act_asset_name); 
       p2_d1_col = clrRed; 
   } 
   else { 
       p2_d1_str = "[x] Not Opposite / Not Stable"; 
       p2_d1_col = clrYellow; 
   }

   double cci_val = GetBufferValue(h_cci, 0, 0); 
   if (cci_val <= CCIOversold) { 
       p3_cci_str = "[OK] Zon Oversold"; 
       p3_cci_col = clrLime; 
   } else if (cci_val >= CCIOverbought) { 
       p3_cci_str = "[OK] Zon Overbought"; 
       p3_cci_col = clrRed; 
   } else { 
       p3_cci_str = "CCI NEUTRAL"; 
       p3_cci_col = clrYellow; 
   }
   
   int dt3_sig = GetDT3Signal(); 
   if (dt3_sig == 1) { 
       p3_sig_str = "[OK] Signal: BUY (DT3)"; 
       p3_sig_col = clrLime; 
   } else if (dt3_sig == -1) { 
       p3_sig_str = "[OK] Signal: SELL (DT3)"; 
       p3_sig_col = clrRed; 
   } else { 
       p3_sig_str = "NO SIGNAL (DT3)"; 
       p3_sig_col = clrGray; 
   }

   double op_mn = iOpen(_Symbol, PERIOD_MN1, 0);
   double op_w1 = iOpen(_Symbol, PERIOD_W1, 0);
   double open_price_d1_al = iOpen(_Symbol, PERIOD_D1, 0);
   
   if (op_mn <= op_w1 && op_w1 <= open_price_d1_al) { 
       p3_op_str = "[OK] OP MN <= W1 <= D1 (Ke Atas)"; 
       p3_op_col = clrLime; 
   } 
   else if (op_mn >= op_w1 && op_w1 >= open_price_d1_al) { 
       p3_op_str = "[OK] OP MN >= W1 >= D1 (Ke Bawah)"; 
       p3_op_col = clrRed; 
   } 
   else { 
       p3_op_str = "ALGEBRA MIXED"; 
       p3_op_col = clrYellow; 
   }

   static datetime last_snr_time = 0; 
   datetime curr_snr_time = iTime(_Symbol, BOSTimeframe, 0); 
   if(curr_snr_time != last_snr_time && curr_snr_time != 0) { 
       if(DetectLevels(BOSTimeframe, SNR_Lookback, SNR_MaxLevels)) {
           last_snr_time = curr_snr_time; 
       }
   }
   
   bool in_support = false, in_resistance = false; 
   for(int i = 0; i < m_level_count; i++) { 
      double high_bound = MathMax(m_levels[i].price, m_levels[i].price_body); 
      double low_bound = MathMin(m_levels[i].price, m_levels[i].price_body); 
      
      if(current_price <= high_bound && current_price >= low_bound) { 
         if(m_levels[i].state == STATE_ACTIVE) { 
             if(m_levels[i].type == TYPE_SUPPORT) in_support = true; 
             if(m_levels[i].type == TYPE_RESISTANCE) in_resistance = true; 
         }
         else if(m_levels[i].state == STATE_BROKEN && ShowRBS_SBR) { 
             if(m_levels[i].type == TYPE_SUPPORT) in_resistance = true; 
             if(m_levels[i].type == TYPE_RESISTANCE) in_support = true; 
         }
      } 
   }
   
   if (in_support) { 
       p3_snd_str = "[OK] Zon Support (SNR)"; 
       p3_snd_col = clrLime; 
   } 
   else if (in_resistance) { 
       p3_snd_str = "[OK] Zon Resistance (SNR)"; 
       p3_snd_col = clrRed; 
   } 
   else { 
       p3_snd_str = "IN BETWEEN ZONES"; 
       p3_snd_col = clrYellow; 
   }

   double bull_pwr = MathAbs(GetBufferValue(h_bulls, 0, 0));
   double bear_pwr = MathAbs(GetBufferValue(h_bears, 0, 0));
   double total_pwr = bull_pwr + bear_pwr; 
   
   if (total_pwr > 0) { 
       double buyer_pct = (bull_pwr / total_pwr) * 100.0;
       double seller_pct = (bear_pwr / total_pwr) * 100.0; 
       if (buyer_pct >= Min_Volume_Percent) { 
           p3_4x_str = StringFormat("[OK] %.1f%% Buyers", buyer_pct); 
           p3_4x_col = clrLime; 
       } 
       else if (seller_pct >= Min_Volume_Percent) { 
           p3_4x_str = StringFormat("[OK] %.1f%% Sellers", seller_pct); 
           p3_4x_col = clrRed; 
       } 
       else { 
           p3_4x_str = StringFormat("B:%.0f%% | S:%.0f%%", buyer_pct, seller_pct); 
           p3_4x_col = clrYellow; 
       } 
   }

   int rank_h1 = 0, rank_h4 = 0, rank_d1 = 0;
   if(GlobalVariableCheck("3S_Live_USD_Rank_H1")) rank_h1 = (int)GlobalVariableGet("3S_Live_USD_Rank_H1"); 
   if(GlobalVariableCheck("3S_Live_USD_Rank_H4")) rank_h4 = (int)GlobalVariableGet("3S_Live_USD_Rank_H4"); 
   if(GlobalVariableCheck("3S_Live_USD_Rank_D1")) rank_d1 = (int)GlobalVariableGet("3S_Live_USD_Rank_D1");
   
   if (rank_h1 == 0 && rank_h4 == 0 && rank_d1 == 0) { 
       p2_rank_str = "WAITING FOR BASKET DASHBOARD"; 
       p2_rank_col = clrGray; 
   } else { 
       int weak_count = 0, strong_count = 0; 
       if (rank_h1 >= 7) weak_count++; else if (rank_h1 > 0 && rank_h1 <= 2) strong_count++; 
       if (rank_h4 >= 7) weak_count++; else if (rank_h4 > 0 && rank_h4 <= 2) strong_count++; 
       if (rank_d1 >= 7) weak_count++; else if (rank_d1 > 0 && rank_d1 <= 2) strong_count++; 
       
       string rank_disp = StringFormat("%d|%d|%d", rank_h1, rank_h4, rank_d1); 
       if (weak_count >= 2) { 
           p2_rank_str = StringFormat("[OK] %s (Lemah)", rank_disp); 
           p2_rank_col = clrLime; 
       } else if (strong_count >= 2) { 
           p2_rank_str = StringFormat("[OK] %s (Kuat)", rank_disp); 
           p2_rank_col = clrRed; 
       } else { 
           p2_rank_str = StringFormat("%s (Sederhana)", rank_disp); 
           p2_rank_col = clrYellow; 
       } 
   }
   
   int active_inf_state = (state_inf == 0) ? api_inf_result : state_inf;
   int active_pol_state = (state_pol == 0) ? api_pol_result : state_pol;

   if(TimeCurrent() - last_mln_fetch >= MLN_Refresh_Seconds) {
       CJAVal json; 
       json["symbol"] = _Symbol; 
       json["local_atr_regime"] = local_regime;
       
       json["pillars"]["inf_state"] = (active_inf_state == 1) ? 1 : (active_inf_state == 2 ? -1 : 0);
       json["pillars"]["pol_state"] = (active_pol_state == 1) ? 1 : (active_pol_state == 2 ? -1 : 0);
       json["pillars"]["news"]      = (p1_news_col == clrLime) ? 1 : (p1_news_col == clrRed ? -1 : 0);
       json["pillars"]["asset"]     = (p2_h1_col == clrLime) ? 1 : (p2_h1_col == clrRed ? -1 : 0);
       json["pillars"]["dxy"]       = (p1_DXY_col == clrLime) ? 1 : (p1_DXY_col == clrRed ? -1 : 0);
       json["pillars"]["y10"]       = 0; 
       json["pillars"]["warna"]     = (p2_warna_col == clrLime) ? 1 : (p2_warna_col == clrRed ? -1 : 0);
       json["pillars"]["p2_h1"]     = (p2_h1_col == clrLime) ? 1 : (p2_h1_col == clrRed ? -1 : 0);
       json["pillars"]["p2_h4"]     = (p2_h4_col == clrLime) ? 1 : (p2_h4_col == clrRed ? -1 : 0);
       json["pillars"]["p2_d1"]     = (p2_d1_col == clrLime) ? 1 : (p2_d1_col == clrRed ? -1 : 0);
       json["pillars"]["p2_rank"]   = (p2_rank_col == clrLime) ? 1 : (p2_rank_col == clrRed ? -1 : 0);
       json["pillars"]["p3_op"]     = (p3_op_col == clrLime) ? 1 : (p3_op_col == clrRed ? -1 : 0);
       json["pillars"]["p3_snd"]    = (p3_snd_col == clrLime) ? 1 : (p3_snd_col == clrRed ? -1 : 0);
       json["pillars"]["p3_cci"]    = (p3_cci_col == clrLime) ? 1 : (p3_cci_col == clrRed ? -1 : 0);
       json["pillars"]["p3_sig"]    = (p3_sig_col == clrLime) ? 1 : (p3_sig_col == clrRed ? -1 : 0);
       json["pillars"]["p3_adr"]    = (p3_adr_col == clrLime) ? 1 : (p3_adr_col == clrRed ? -1 : 0);
       json["pillars"]["p3_4x"]     = (p3_4x_col == clrLime) ? 1 : (p3_4x_col == clrRed ? -1 : 0);
       
       string payload; 
       json.Serialize(payload); 
       char post[], result[]; 
       string headers = "Content-Type: application/json\r\nX-API-Key: " + g_customer_api_key + "\r\n", res_headers; 
       StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
       
       int res = WebRequest("POST", MLN_Predict_URL, headers, 5000, post, result, res_headers);
       if(res == 200) { 
           string json_resp = CharArrayToString(result); 
           CJAVal respData; 
           if(respData.Deserialize(json_resp)) { 
               mln_prob_buy = respData["buy_probability"].ToDbl(); 
               mln_prob_sell = respData["sell_probability"].ToDbl(); 
               
               if(respData["regime"].ToStr() != "") {
                   current_regime = respData["regime"].ToStr(); 
               }
               
               int py_inf = 0, py_pol = 0, py_y10 = 0;
               
               if(state_inf == 0) { 
                   py_inf = (int)respData["macro_states"]["inf_state"].ToInt(); 
                   if(py_inf == 1) api_inf_result = 1; 
                   else if(py_inf == -1) api_inf_result = 2; 
                   else api_inf_result = 0; 
               }
               if(state_pol == 0) { 
                   py_pol = (int)respData["macro_states"]["pol_state"].ToInt(); 
                   if(py_pol == 1) api_pol_result = 1; 
                   else if(py_pol == -1) api_pol_result = 2; 
                   else api_pol_result = 0; 
               }
               
               py_y10 = (int)respData["macro_states"]["y10_state"].ToInt();
               string fred_status = respData["provider_status"]["fred"]["status"].ToStr();
               string fred_message = respData["provider_status"]["fred"]["message"].ToStr();
               string y10_status = StringFormat("y10=%d|fred=%s|detail=%s", py_y10, fred_status, fred_message);
               if(y10_status != g_last_mln_y10_status) {
                   Print("3S EA: MasterServer Y10 status: ", y10_status);
                   g_last_mln_y10_status = y10_status;
               }
               if(py_y10 == 1) { 
                   p1_y10_str = "[PYTHON] Lemah (Yield Turun)"; 
                   p1_y10_col = clrLime; 
               } 
               else if (py_y10 == -1) { 
                   p1_y10_str = "[PYTHON] Kuat (Yield Naik)"; 
                   p1_y10_col = clrRed; 
               } 
               else {
                   if(api_y10_live > 0 && api_y10_open > 0) { 
                       if(api_y10_live >= api_y10_open) { 
                           p1_y10_str = "[FALLBACK] Kuat (Yield Naik)"; 
                           p1_y10_col = clrRed; 
                       } 
                       else { 
                           p1_y10_str = "[FALLBACK] Lemah (Yield Turun)"; 
                           p1_y10_col = clrLime; 
                       } 
                   } else { 
                       p1_y10_str = "[PYTHON ERROR] Tunggu API..."; 
                       p1_y10_col = clrGray; 
                   }
               }
               
               if(py_inf == 0 || py_pol == 0) {
                   FetchAllFREDData(); 
               }
               UpdateManualStates();
           } 
       } else { 
           Print("MLN Server Error: ", res, " -> Mengaktifkan Sistem Failsafe Native API...");
           
           current_regime = local_regime; // ATR Failsafe execution
           
           if(api_y10_live > 0 && api_y10_open > 0) { 
               if(api_y10_live >= api_y10_open) { 
                   p1_y10_str = "[NATIVE] Kuat (Yield Naik)"; 
                   p1_y10_col = clrRed; 
               } else { 
                   p1_y10_str = "[NATIVE] Lemah (Yield Turun)"; 
                   p1_y10_col = clrLime; 
               } 
           } else { 
               p1_y10_str = "SERVER OFFLINE & API KOSONG"; 
               p1_y10_col = clrGray; 
           }
           FetchAllFREDData(); 
           UpdateManualStates();
       }
       last_mln_fetch = TimeCurrent();
   }

   int b_sc = 0, s_sc = 0;
   if(active_inf_state == 1) b_sc++; else if(active_inf_state == 2) s_sc++; 
   if(active_pol_state == 1) b_sc++; else if(active_pol_state == 2) s_sc++;
   
   if(p1_news_col == clrLime) b_sc++; else if(p1_news_col == clrRed) s_sc++; 
   if(p1_asset_col == clrLime) b_sc++; else if(p1_asset_col == clrRed) s_sc++; 
   if(p1_DXY_col == clrLime) b_sc++; else if(p1_DXY_col == clrRed) s_sc++; 
   if(p1_y10_col == clrLime) b_sc++; else if(p1_y10_col == clrRed) s_sc++; 
   
   if(p2_warna_col == clrLime) b_sc++; else if(p2_warna_col == clrRed) s_sc++; 
   if(p2_h1_col == clrLime) b_sc++; else if(p2_h1_col == clrRed) s_sc++; 
   if(p2_h4_col == clrLime) b_sc++; else if(p2_h4_col == clrRed) s_sc++; 
   if(p2_d1_col == clrLime) b_sc++; else if(p2_d1_col == clrRed) s_sc++; 
   if(p2_rank_col == clrLime) b_sc++; else if(p2_rank_col == clrRed) s_sc++; 
   
   if(p3_op_col == clrLime) b_sc++; else if(p3_op_col == clrRed) s_sc++; 
   if(p3_snd_col == clrLime) b_sc++; else if(p3_snd_col == clrRed) s_sc++; 
   if(p3_cci_col == clrLime) b_sc++; else if(p3_cci_col == clrRed) s_sc++; 
   if(p3_sig_col == clrLime) b_sc++; else if(p3_sig_col == clrRed) s_sc++; 
   if(p3_adr_col == clrLime) b_sc++; else if(p3_adr_col == clrRed) s_sc++; 
   if(p3_4x_col == clrLime) b_sc++; else if(p3_4x_col == clrRed) s_sc++;
   
   g_score_b = b_sc; 
   g_score_s = s_sc; 
   v_score_b = StringFormat("%d", b_sc); 
   v_score_s = StringFormat("%d", s_sc);

   exec_signal = "WAITING";
   if(mln_prob_buy >= MLN_Min_Probability && g_active_bos == 0 && p3_adr_col == clrLime) { 
       if(b_sc >= Verdict_Approval_Score) { 
           v_verdict_str = StringFormat("MLN BUY [%.0f%%] %s", mln_prob_buy*100, current_regime); 
           v_verdict_col = clrLime; 
           exec_signal = "EXECUTE BUY"; 
       } else { 
           v_verdict_str = "MLN BUY BLOCKED"; 
           v_verdict_col = clrGold; 
       }
   }
   else if(mln_prob_sell >= MLN_Min_Probability && g_active_bos == 1 && p3_adr_col == clrRed) { 
       if(s_sc >= Verdict_Approval_Score) { 
           v_verdict_str = StringFormat("MLN SELL [%.0f%%] %s", mln_prob_sell*100, current_regime); 
           v_verdict_col = clrRed; 
           exec_signal = "EXECUTE SELL"; 
       } else { 
           v_verdict_str = "MLN SELL BLOCKED"; 
           v_verdict_col = clrGold; 
       }
   }
   else { 
       v_verdict_str = StringFormat("MLN Prob: B(%.0f%%) | S(%.0f%%)", mln_prob_buy*100, mln_prob_sell*100); 
       v_verdict_col = clrGold; 
   }
}

void UpdateManualStates() {
   if(state_inf == 0) { 
       if(api_inf_result == 1) { str_inf = "PYTHON: Lemah (BUY)"; col_inf = clrDarkGreen; } 
       else if(api_inf_result == 2) { str_inf = "PYTHON: Kuat (SELL)"; col_inf = clrRed; } 
       else { str_inf = "PYTHON: SYNC"; col_inf = clrGray; } 
   } 
   else if(state_inf == 1) { str_inf = "MANUAL: Lemah (BUY)"; col_inf = clrDarkGreen; } 
   else if(state_inf == 2) { str_inf = "MANUAL: Kuat (SELL)"; col_inf = clrMaroon; }    
   
   if(state_pol == 0) { 
       if(api_pol_result == 1) { str_pol = "PYTHON: Lemah (BUY)"; col_pol = clrDarkGreen; } 
       else if(api_pol_result == 2) { str_pol = "PYTHON: Kuat (SELL)"; col_pol = clrRed; } 
       else { str_pol = "PYTHON: SYNC"; col_pol = clrGray; } 
   } 
   else if(state_pol == 1) { str_pol = "MANUAL: Lemah (BUY)"; col_pol = clrDarkGreen; } 
   else if(state_pol == 2) { str_pol = "MANUAL: Kuat (SELL)"; col_pol = clrMaroon; }
   
   GlobalVariableSet("3S_State_Inf", state_inf); 
   GlobalVariableSet("3S_State_Pol", state_pol);
}

void DrawRect(string name, int x, int y, int w, int h, color bg, color border, int zorder=0) { 
    if (ObjectFind(0, name) < 0) { ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0); }
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); 
    ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y); 
    ObjectSetInteger(0, name, OBJPROP_XSIZE, w); 
    ObjectSetInteger(0, name, OBJPROP_YSIZE, h); 
    ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg); 
    ObjectSetInteger(0, name, OBJPROP_COLOR, border); 
    ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT); 
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER); 
    ObjectSetInteger(0, name, OBJPROP_BACK, false); 
    ObjectSetInteger(0, name, OBJPROP_ZORDER, zorder); 
}

void DrawLabel(string name, int x, int y, string text, int size, color col, bool bold=false, int anchor=0) { 
    if (ObjectFind(0, name) < 0) { ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0); }
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); 
    ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y); 
    ObjectSetString(0, name, OBJPROP_TEXT, text); 
    ObjectSetInteger(0, name, OBJPROP_COLOR, col); 
    ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size); 
    ObjectSetString(0, name, OBJPROP_FONT, bold ? "Arial Bold" : "Arial"); 
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER); 
    ObjectSetInteger(0, name, OBJPROP_ANCHOR, anchor); 
    ObjectSetInteger(0, name, OBJPROP_BACK, false); 
    ObjectSetInteger(0, name, OBJPROP_ZORDER, 10); 
}

void DrawButton(string name, int x, int y, int w, int h, string text, int size, color bg, color fg, int zorder=20) { 
    if (ObjectFind(0, name) < 0) { ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0); }
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); 
    ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y); 
    ObjectSetInteger(0, name, OBJPROP_XSIZE, w); 
    ObjectSetInteger(0, name, OBJPROP_YSIZE, h); 
    ObjectSetString(0, name, OBJPROP_TEXT, text); 
    ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg); 
    ObjectSetInteger(0, name, OBJPROP_COLOR, fg); 
    ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size); 
    ObjectSetString(0, name, OBJPROP_FONT, "Arial"); 
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER); 
    ObjectSetInteger(0, name, OBJPROP_STATE, false); 
    ObjectSetInteger(0, name, OBJPROP_BACK, false); 
    ObjectSetInteger(0, name, OBJPROP_ZORDER, zorder); 
}

void DrawBitmap(string name, int x, int y, string file, int zorder=5) { 
    if (ObjectFind(0, name) < 0) { ObjectCreate(0, name, OBJ_BITMAP_LABEL, 0, 0, 0); }
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); 
    ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y); 
    ObjectSetString(0, name, OBJPROP_BMPFILE, 0, file); 
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER); 
    ObjectSetInteger(0, name, OBJPROP_BACK, false); 
    ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false); 
    ObjectSetInteger(0, name, OBJPROP_HIDDEN, true); 
    ObjectSetInteger(0, name, OBJPROP_ZORDER, zorder); 
}

void InitGUI() {
   if(is_minimized) {
       ObjectsDeleteAll(0, "MLN_HUD"); ObjectsDeleteAll(0, "MLN_P1");
       ObjectsDeleteAll(0, "MLN_P2"); ObjectsDeleteAll(0, "MLN_P3");
       ObjectsDeleteAll(0, "MLN_Sig"); ObjectsDeleteAll(0, "MLN_L_");
       ObjectsDeleteAll(0, "MLN_V_"); ObjectsDeleteAll(0, "MLN_S_");
       ObjectsDeleteAll(0, "MLN_GH"); ObjectsDeleteAll(0, "MLN_Title");
       ObjectsDeleteAll(0, "MLN_Desc"); ObjectsDeleteAll(0, "MLN_SafeTP");
       ObjectsDeleteAll(0, "MLN_EstTP"); ObjectsDeleteAll(0, "MLN_LivePL");
       ObjectsDeleteAll(0, "MLN_Watermark"); ObjectsDeleteAll(0, "BTN_Inf");
       ObjectsDeleteAll(0, "BTN_Pol");
   } 
   
   int total_h = is_minimized ? S(30) : S(405);
   int total_w = S(945);
   int C1 = PanelX + S(15), C2 = PanelX + S(325), C3 = PanelX + S(635), CW = S(295);
   
   DrawRect("MLN_BG", PanelX, PanelY, total_w, total_h, BgColor, BorderColor, 0); 
   DrawRect("MLN_TopBar", PanelX, PanelY, total_w, S(30), C'12,12,15', BorderColor, 1);
   
   DrawLabel("MLN_TopTitle", PanelX + S(10), PanelY + S(7), StringFormat("3S EA UNIVERSAL DASH (%s) • v4.1 Markov Logic", act_asset_name), F(9), clrGold, true, ANCHOR_LEFT_UPPER);
   DrawLabel("MLN_TopCenter", PanelX + S(475), PanelY + S(7), "[ SCANNING ] | Masa: 2026.08.07 20:35:17 MYT", F(9), clrWhite, true, ANCHOR_UPPER);
   DrawLabel("MLN_API_Diag", PanelX + S(875), PanelY + S(8), "API: (TD: OK | CAL: OK | AV: WAIT | FR: OK)", F(7), clrSilver, false, ANCHOR_RIGHT_UPPER);
   DrawButton("BTN_Toggle", PanelX + S(885), PanelY + S(5), S(55), S(20), is_minimized ? "[ SHOW ]" : "[ HIDE ]", F(8), C'40,40,40', clrWhite, 20);
   
   if(is_minimized) { ChartRedraw(); return; }
   
   int hudY = PanelY + S(40);
   DrawRect("MLN_HUD_1", C1, hudY, CW, S(95), C'20,20,25', BorderColor, 1);
   DrawRect("MLN_HUD_2", C2, hudY, CW, S(95), C'20,20,25', BorderColor, 1);
   DrawRect("MLN_HUD_3", C3, hudY, CW, S(95), C'20,20,25', BorderColor, 1);

   DrawLabel("MLN_L_Bal", C1 + S(10), hudY + S(10), "Balance:", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Bal", C1 + S(70), hudY + S(10), "-", F(8), clrWhite, true, 0); 
   DrawLabel("MLN_L_Eq", C1 + S(10), hudY + S(28), "Equity:", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Eq", C1 + S(70), hudY + S(28), "-", F(8), clrWhite, true, 0); 
   DrawLabel("MLN_L_DD", C1 + S(10), hudY + S(46), "Drawdown:", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_DD", C1 + S(70), hudY + S(46), "-", F(8), clrLime, true, 0); 
   DrawLabel("MLN_L_Hist", C1 + S(10), hudY + S(64), "Last 3:", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Hist", C1 + S(70), hudY + S(64), "-", F(8), clrGold, true, 0);
   DrawButton("MLN_V_Growth", C1 + S(135), hudY + S(10), S(150), S(20), "Total ROI: +$0.00 (0.00%)", F(8), clrDarkGreen, clrWhite, 15); 

   DrawLabel("MLN_GH_Sub", C2 + S(147), hudY + S(10), "||  THE GOLDEN HOUR  ||", F(8), clrGold, true, ANCHOR_UPPER); 
   DrawLabel("MLN_GH_9", C2 + S(50), hudY + S(35), "09:00", F(20), clrGold, true, ANCHOR_UPPER); 
   DrawLabel("MLN_GH_13", C2 + S(147), hudY + S(35), "13:00", F(20), clrGold, true, ANCHOR_UPPER); 
   DrawLabel("MLN_GH_21", C2 + S(245), hudY + S(35), "21:00", F(20), clrGold, true, ANCHOR_UPPER); 
   DrawLabel("MLN_GH_Count", C2 + S(147), hudY + S(70), "Next Golden Hour in 0h 0m 0s", F(8), clrLightGray, false, ANCHOR_UPPER);

   int textX = C3 + S(180);
   int logoX = C3 + S(200);
   DrawLabel("MLN_SafeTP", textX, hudY + S(20), "Safe TP: SCANNING...", F(9), clrPlum, true, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_LivePL", textX, hudY + S(40), "P/L: 0.00 USC", F(9), clrLime, true, ANCHOR_RIGHT_UPPER);
   DrawLabel("MLN_EstTP",  textX, hudY + S(60), "Est TP $: 0.00 USC", F(9), clrMediumAquamarine, true, ANCHOR_RIGHT_UPPER); 
   DrawBitmap("MLN_Watermark", logoX, hudY + S(10), "::Images\\fizu_logo.bmp", 5);

   int pY = hudY + S(110);
   DrawLabel("MLN_Title", C1, pY, "Trade Setup Checklist", F(14), clrWhite, true, 0); 
   DrawLabel("MLN_Desc", C1, pY + S(22), gh_desc_str, F(8), clrGray, false, 0);

   int matY = pY + S(40);
   DrawRect("MLN_P1_Box", C1, matY, CW, S(145), C'20,20,25', BorderColor, 1); 
   DrawLabel("MLN_P1_Title", C1 + S(10), matY + S(8), "PILLAR 1: Fundamental", F(8), clrGold, true, 0); 
   
   int row1 = matY + S(28), spacing = S(18), valX = CW - S(10);
   DrawLabel("MLN_L_News", C1 + S(10), row1, "Berita USD (News Harian)", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_News", C1 + valX, row1, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   
   DrawLabel("MLN_L_Inf", C1 + S(10), row1 + spacing, "Kadar Inflasi AS", F(8), clrLightGray, false, 0); 
   DrawButton("BTN_Inf", C1 + valX - S(130), row1 + spacing - S(2), S(130), S(16), "[API] AUTO", F(8), C'40,40,40', clrWhite, 20); 
   
   DrawLabel("MLN_L_Pol", C1 + S(10), row1 + spacing*2, "Polisi Kewangan", F(8), clrLightGray, false, 0); 
   DrawButton("BTN_Pol", C1 + valX - S(130), row1 + spacing*2 - S(2), S(130), S(16), "[API] AUTO", F(8), C'40,40,40', clrWhite, 20); 
   
   DrawLabel("MLN_L_XAU", C1 + S(10), row1 + spacing*3, "Harga Aset (GOLD)", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_XAU", C1 + valX, row1 + spacing*3, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_DXY", C1 + S(10), row1 + spacing*4, "Indeks USD (DXY) %", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_DXY", C1 + valX, row1 + spacing*4, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_Y10", C1 + S(10), row1 + spacing*5, "Bond 10-Tahun (Y10) %", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Y10", C1 + valX, row1 + spacing*5, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER);

   DrawRect("MLN_P2_Box", C2, matY, CW, S(145), C'20,20,25', BorderColor, 1); 
   DrawLabel("MLN_P2_Title", C2 + S(10), matY + S(8), "PILLAR 2: Sistem PAP", F(8), clrDeepSkyBlue, true, 0); 
   DrawLabel("MLN_L_Warna", C2 + S(10), row1, "GOLD & DXY Warna", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Warna", C2 + valX, row1, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_H1", C2 + S(10), row1 + spacing, "GOLD Trend", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_H1", C2 + valX, row1 + spacing, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_H4", C2 + S(10), row1 + spacing*2, "DXY Trend", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_H4", C2 + valX, row1 + spacing*2, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_D1", C2 + S(10), row1 + spacing*3, "SOP Cross", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_D1", C2 + valX, row1 + spacing*3, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_Rank", C2 + S(10), row1 + spacing*4, "Ranking USD", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Rank", C2 + valX, row1 + spacing*4, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER);

   DrawRect("MLN_P3_Box", C3, matY, CW, S(145), C'20,20,25', BorderColor, 1); 
   DrawLabel("MLN_P3_Title", C3 + S(10), matY + S(8), "PILLAR 3: Teknikal", F(8), clrMediumOrchid, true, 0); 
   DrawLabel("MLN_L_OP", C3 + S(10), row1, "Open Price - Algebra", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_OP", C3 + valX, row1, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_SnD", C3 + S(10), row1 + spacing, "Harga di Zon SNR", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_SnD", C3 + valX, row1 + spacing, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_CCI", C3 + S(10), row1 + spacing*2, "Momentum CCI", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_CCI", C3 + valX, row1 + spacing*2, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_Sig", C3 + S(10), row1 + spacing*3, "Signal (DT3-ZigZag)", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_DT3", C3 + valX, row1 + spacing*3, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_ADR", C3 + S(10), row1 + spacing*4, "FMCBR Fibo TP", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_ADR", C3 + valX, row1 + spacing*4, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER); 
   DrawLabel("MLN_L_4X", C3 + S(10), row1 + spacing*5, "4X-Predictor Dominasi", F(8), clrLightGray, false, 0); 
   DrawLabel("MLN_V_4X", C3 + valX, row1 + spacing*5, "-", F(8), clrWhite, false, ANCHOR_RIGHT_UPPER);

   int vY = matY + S(155);
   DrawRect("MLN_Sig_BG", C1, vY, total_w - S(30), S(45), C'20,15,5', clrGold, 1); 
   DrawLabel("MLN_L_Verdict", C1 + S(10), vY + S(5), "SETUP VERDICT", F(7), clrLightGray, false, 0); 
   DrawLabel("MLN_V_Sig", C1 + S(10), vY + S(18), "Begin Checking...", F(16), clrGold, true, 0);
   DrawLabel("MLN_S_Total", C1 + S(905), vY + S(15), "BUY: 0 | SELL: 0 | TOTAL: 17/17", F(14), clrWhite, true, ANCHOR_RIGHT_UPPER); 
}

void UpdateGUI() {
   datetime myt_time = TimeGMT() + (8 * 3600); 
   string date_str = TimeToString(myt_time, TIME_DATE); 
   StringReplace(date_str, ".", "-");
   string time_str = TimeToString(myt_time, TIME_SECONDS);
   string center_str = StringFormat("[ %s ] | Masa: %s %s MYT", current_regime, date_str, time_str);
   
   ObjectSetString(0, "MLN_TopCenter", OBJPROP_TEXT, center_str);
   
   color reg_c = clrMediumOrchid; 
   if(current_regime == "VOLATILE") reg_c = clrLime; 
   if(current_regime == "QUIET") reg_c = clrMediumOrchid;
   ObjectSetInteger(0, "MLN_TopCenter", OBJPROP_COLOR, reg_c); 

   string api_str = StringFormat("API: (TD: %s | CAL: %s | AV: %s | FR: %s)", api_td_stat, api_cal_stat, api_av_stat, api_fr_stat);
   ObjectSetString(0, "MLN_API_Diag", OBJPROP_TEXT, api_str);
   ObjectSetString(0, "MLN_Clock", OBJPROP_TEXT, gh_clock_str); 
   
   double bal = AccountInfoDouble(ACCOUNT_BALANCE), eq = AccountInfoDouble(ACCOUNT_EQUITY); 
   if(Is_Cent_Account) { bal /= 100.0; eq /= 100.0; }
   double dd_pct = (bal > 0 && eq < bal) ? ((bal - eq) / bal) * 100.0 : 0.0;
   
   datetime hist_start = UseCustomHistoryDates ? CustomStartDate : 0;
   datetime hist_end = UseCustomHistoryDates ? CustomEndDate : TimeCurrent();
   HistorySelect(hist_start, hist_end); 
   
   int histTotal = HistoryDealsTotal(), count = 0; 
   string hist_str = ""; 
   double total_profit = 0.0, total_deposits = 0.0; 
   
   for(int i = histTotal - 1; i >= 0; i--) { 
      ulong ticket = HistoryDealGetTicket(i); 
      long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE); 
      double d_prof = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      
      if(deal_type == DEAL_TYPE_BALANCE || deal_type == DEAL_TYPE_CREDIT || deal_type == DEAL_TYPE_BONUS) { 
          if(d_prof > 0) total_deposits += d_prof; 
      }
      else if(deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL) { 
         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT || entry == DEAL_ENTRY_OUT_BY) { 
            double net_deal = d_prof + HistoryDealGetDouble(ticket, DEAL_SWAP) + HistoryDealGetDouble(ticket, DEAL_COMMISSION) + HistoryDealGetDouble(ticket, DEAL_FEE);
            
            if(HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol && HistoryDealGetInteger(ticket, DEAL_MAGIC) == MagicNumber) {
                total_profit += net_deal;
                if(count < 3) { 
                    if(net_deal >= 0) StringAdd(hist_str, "[W] "); 
                    else StringAdd(hist_str, "[L] "); 
                    count++; 
                }
            }
         } 
      } 
   }
   if(hist_str == "") hist_str = "No trades yet"; 
   if(total_deposits <= 0) { 
       total_deposits = AccountInfoDouble(ACCOUNT_BALANCE) - total_profit; 
       if (total_deposits <= 0) total_deposits = AccountInfoDouble(ACCOUNT_BALANCE); 
   }
   if(Is_Cent_Account) { total_profit /= 100.0; total_deposits /= 100.0; }
   
   double growth_pct = (total_deposits > 0) ? (total_profit / total_deposits) * 100.0 : 0.0;
   string growth_str = StringFormat("Total ROI: %s$%.2f (%.2f%%)", (total_profit > 0 ? "+" : ""), total_profit, growth_pct);

   if(!is_minimized) {
      ObjectSetInteger(0, "MLN_GH_9", OBJPROP_COLOR, is_gh_9 ? clrLime : C'60,60,60'); 
      ObjectSetInteger(0, "MLN_GH_13", OBJPROP_COLOR, is_gh_13 ? clrLime : C'60,60,60'); 
      ObjectSetInteger(0, "MLN_GH_21", OBJPROP_COLOR, is_gh_21 ? clrLime : C'60,60,60'); 
      ObjectSetString(0, "MLN_GH_Count", OBJPROP_TEXT, gh_count_str); 
      ObjectSetString(0, "MLN_Desc", OBJPROP_TEXT, gh_desc_str);
      
      string acc_curr = AccountInfoString(ACCOUNT_CURRENCY);
      if (GetTotalOrders() > 0) {
          if (global_active_tp > 0) {
             ObjectSetString(0, "MLN_SafeTP", OBJPROP_TEXT, StringFormat("Safe TP: %.*f (%s)", _Digits, global_active_tp, active_basket_tp_label));
             ObjectSetInteger(0, "MLN_SafeTP", OBJPROP_COLOR, clrPlum);
             
             double raw_est_profit = GetExpectedProfitAtPrice(global_active_tp);
             double disp_est_profit = Is_Cent_Account ? (raw_est_profit / 100.0) : raw_est_profit;
             
             ObjectSetString(0, "MLN_EstTP", OBJPROP_TEXT, StringFormat("Est TP $: %.2f %s", disp_est_profit, acc_curr));
             if(disp_est_profit > 0) ObjectSetInteger(0, "MLN_EstTP", OBJPROP_COLOR, clrLime); 
             else if(disp_est_profit < 0) ObjectSetInteger(0, "MLN_EstTP", OBJPROP_COLOR, clrCrimson); 
             else ObjectSetInteger(0, "MLN_EstTP", OBJPROP_COLOR, clrMediumAquamarine);
          } else {
             ObjectSetString(0, "MLN_SafeTP", OBJPROP_TEXT, "Safe TP: SCANNING..."); 
             ObjectSetInteger(0, "MLN_SafeTP", OBJPROP_COLOR, clrGold);
             ObjectSetString(0, "MLN_EstTP", OBJPROP_TEXT, StringFormat("Est TP $: 0.00 %s", acc_curr)); 
             ObjectSetInteger(0, "MLN_EstTP", OBJPROP_COLOR, clrDarkGray);
          }
          
          double live_raw_profit = 0.0;
          for(int i = 0; i < PositionsTotal(); i++) {
              if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) { 
                  live_raw_profit += PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP); 
              }
          }
          double disp_live_profit = Is_Cent_Account ? (live_raw_profit / 100.0) : live_raw_profit;
          ObjectSetString(0, "MLN_LivePL", OBJPROP_TEXT, StringFormat("P/L: %.2f %s", disp_live_profit, acc_curr)); 
          ObjectSetInteger(0, "MLN_LivePL", OBJPROP_COLOR, (disp_live_profit >= 0) ? clrLime : clrCrimson);

      } else {
          ObjectSetString(0, "MLN_SafeTP", OBJPROP_TEXT, "Safe TP: WAITING FOR ENTRY"); 
          ObjectSetInteger(0, "MLN_SafeTP", OBJPROP_COLOR, clrGray);
          ObjectSetString(0, "MLN_LivePL", OBJPROP_TEXT, StringFormat("P/L: 0.00 %s", acc_curr)); 
          ObjectSetInteger(0, "MLN_LivePL", OBJPROP_COLOR, clrDarkGray);
          ObjectSetString(0, "MLN_EstTP", OBJPROP_TEXT, StringFormat("Est TP $: 0.00 %s", acc_curr)); 
          ObjectSetInteger(0, "MLN_EstTP", OBJPROP_COLOR, clrDarkGray);
      }
      
      ObjectSetString(0, "MLN_V_Bal", OBJPROP_TEXT, StringFormat("$%.2f", bal)); 
      ObjectSetString(0, "MLN_V_Eq", OBJPROP_TEXT, StringFormat("$%.2f", eq)); 
      ObjectSetString(0, "MLN_V_DD", OBJPROP_TEXT, StringFormat("%.2f%%", dd_pct)); 
      ObjectSetInteger(0, "MLN_V_DD", OBJPROP_COLOR, (dd_pct > 0) ? clrRed : clrLime);
      
      ObjectSetString(0, "MLN_V_Hist", OBJPROP_TEXT, hist_str); 
      ObjectSetString(0, "MLN_V_Growth", OBJPROP_TEXT, growth_str); 
      ObjectSetInteger(0, "MLN_V_Growth", OBJPROP_BGCOLOR, (total_profit > 0) ? clrDarkGreen : ((total_profit < 0) ? clrMaroon : C'40,40,40'));
      
      ObjectSetString(0, "MLN_V_News", OBJPROP_TEXT, p1_news_str); ObjectSetInteger(0, "MLN_V_News", OBJPROP_COLOR, p1_news_col); 
      
      ObjectSetString(0, "BTN_Inf", OBJPROP_TEXT, str_inf); 
      ObjectSetInteger(0, "BTN_Inf", OBJPROP_BGCOLOR, col_inf); 
      ObjectSetInteger(0, "BTN_Inf", OBJPROP_COLOR, clrWhite);
      
      ObjectSetString(0, "BTN_Pol", OBJPROP_TEXT, str_pol); 
      ObjectSetInteger(0, "BTN_Pol", OBJPROP_BGCOLOR, col_pol); 
      ObjectSetInteger(0, "BTN_Pol", OBJPROP_COLOR, clrWhite);
      
      ObjectSetString(0, "MLN_V_XAU", OBJPROP_TEXT, p1_asset_str); ObjectSetInteger(0, "MLN_V_XAU", OBJPROP_COLOR, p1_asset_col); 
      ObjectSetString(0, "MLN_V_DXY", OBJPROP_TEXT, p1_DXY_str); ObjectSetInteger(0, "MLN_V_DXY", OBJPROP_COLOR, p1_DXY_col); 
      ObjectSetString(0, "MLN_V_Y10", OBJPROP_TEXT, p1_y10_str); ObjectSetInteger(0, "MLN_V_Y10", OBJPROP_COLOR, p1_y10_col);
      
      ObjectSetString(0, "MLN_V_Warna", OBJPROP_TEXT, p2_warna_str); ObjectSetInteger(0, "MLN_V_Warna", OBJPROP_COLOR, p2_warna_col); 
      ObjectSetString(0, "MLN_V_H1", OBJPROP_TEXT, p2_h1_str); ObjectSetInteger(0, "MLN_V_H1", OBJPROP_COLOR, p2_h1_col); 
      ObjectSetString(0, "MLN_V_H4", OBJPROP_TEXT, p2_h4_str); ObjectSetInteger(0, "MLN_V_H4", OBJPROP_COLOR, p2_h4_col); 
      ObjectSetString(0, "MLN_V_D1", OBJPROP_TEXT, p2_d1_str); ObjectSetInteger(0, "MLN_V_D1", OBJPROP_COLOR, p2_d1_col); 
      ObjectSetString(0, "MLN_V_Rank", OBJPROP_TEXT, p2_rank_str); ObjectSetInteger(0, "MLN_V_Rank", OBJPROP_COLOR, p2_rank_col);
      
      ObjectSetString(0, "MLN_V_OP", OBJPROP_TEXT, p3_op_str); ObjectSetInteger(0, "MLN_V_OP", OBJPROP_COLOR, p3_op_col); 
      ObjectSetString(0, "MLN_V_SnD", OBJPROP_TEXT, p3_snd_str); ObjectSetInteger(0, "MLN_V_SnD", OBJPROP_COLOR, p3_snd_col); 
      ObjectSetString(0, "MLN_V_CCI", OBJPROP_TEXT, p3_cci_str); ObjectSetInteger(0, "MLN_V_CCI", OBJPROP_COLOR, p3_cci_col); 
      ObjectSetString(0, "MLN_V_DT3", OBJPROP_TEXT, p3_sig_str); ObjectSetInteger(0, "MLN_V_DT3", OBJPROP_COLOR, p3_sig_col); 
      ObjectSetString(0, "MLN_V_ADR", OBJPROP_TEXT, p3_adr_str); ObjectSetInteger(0, "MLN_V_ADR", OBJPROP_COLOR, p3_adr_col); 
      ObjectSetString(0, "MLN_V_4X", OBJPROP_TEXT, p3_4x_str); ObjectSetInteger(0, "MLN_V_4X", OBJPROP_COLOR, p3_4x_col);
      
      ObjectSetString(0, "MLN_V_Sig", OBJPROP_TEXT, v_verdict_str); 
      ObjectSetInteger(0, "MLN_V_Sig", OBJPROP_COLOR, v_verdict_col); 
      ObjectSetInteger(0, "MLN_Sig_BG", OBJPROP_COLOR, v_verdict_col);
      
      ObjectSetString(0, "MLN_S_Total", OBJPROP_TEXT, StringFormat("BUY: %d | SELL: %d | TOTAL: 17/17", g_score_b, g_score_s));
   }
   ChartRedraw();
}

double NormalizePriceToTick(double price) {
   double tick_size = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tick_size <= 0.0) tick_size = _Point;
   return NormalizeDouble(MathRound(price / tick_size) * tick_size, _Digits);
}

// Original EA-compatible risk volume calculation is performed directly in CheckEntry().
// It intentionally falls back to a safe tick value and clamps to the broker minimum lot.
// This preserves the original execution behavior for brokers with incomplete tick metadata.

bool CheckEntry() {

   if(exec_signal != "EXECUTE BUY" && exec_signal != "EXECUTE SELL") return false;
   
   PrintFormat("▶️ 3S EA: SETUP 100%% VALID! Memulakan kemasukan %s...", exec_signal);
   
   double pt = _Point;
   double tick_value = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tick_value <= 0.0) tick_value = Is_Cent_Account ? 100.0 : 1.0;
   if(act_SL <= 0) act_SL = 800;
   trade.SetTypeFillingBySymbol(_Symbol);

   double base_ep = (exec_signal == "EXECUTE BUY") ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID), sl_price = 0, tp_price = 0;
   
   double existing_tp = 0;
   for(int i = 0; i < PositionsTotal(); i++) {
       ulong ticket = PositionGetTicket(i);
       if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
           long pos_type = PositionGetInteger(POSITION_TYPE);
           double pos_tp = PositionGetDouble(POSITION_TP);
           double pos_profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
           
           if(exec_signal == "EXECUTE BUY" && pos_type == POSITION_TYPE_BUY) {
               if(pos_profit < 0 && pos_tp > 0) {
                   existing_tp = pos_tp; break; 
               }
           }
           else if(exec_signal == "EXECUTE SELL" && pos_type == POSITION_TYPE_SELL) {
               if(pos_profit < 0 && pos_tp > 0) {
                   existing_tp = pos_tp; break; 
               }
           }
       }
   }
   
   if(exec_signal == "EXECUTE BUY") {
      sl_price = (g_fibo_hanyut > 0) ? NormalizeDouble(g_fibo_hanyut - (Hanyut_Buffer_Points * pt), _Digits) : base_ep - (act_SL * pt);
      
      if(existing_tp > 0) tp_price = existing_tp; 
      else if(g_fibo_tp1 > 0) {
         tp_price = g_fibo_tp1;
         if((g_fibo_tp1 - base_ep) < act_Min_TP_Dist * pt) {
            if((g_fibo_tp2 - base_ep) >= act_Min_TP_Dist * pt) tp_price = g_fibo_tp2;
            else if((g_fibo_tp3 - base_ep) >= act_Min_TP_Dist * pt) tp_price = g_fibo_tp3;
            else tp_price = g_fibo_tamak;
         }
      } else tp_price = base_ep + (act_TP * pt);
   } 
   else if(exec_signal == "EXECUTE SELL") {
      sl_price = (g_fibo_hanyut > 0) ? NormalizeDouble(g_fibo_hanyut + (Hanyut_Buffer_Points * pt), _Digits) : base_ep + (act_SL * pt);
      
      if(existing_tp > 0) tp_price = existing_tp; 
      else if(g_fibo_tp1 > 0) {
         tp_price = g_fibo_tp1;
         if((base_ep - g_fibo_tp1) < act_Min_TP_Dist * pt) {
            if((base_ep - g_fibo_tp2) >= act_Min_TP_Dist * pt) tp_price = g_fibo_tp2;
            else if((base_ep - g_fibo_tp3) >= act_Min_TP_Dist * pt) tp_price = g_fibo_tp3;
            else tp_price = g_fibo_tamak;
         }
      } else tp_price = base_ep - (act_TP * pt);
   }
   
   sl_price = NormalizePriceToTick(sl_price);
   tp_price = NormalizePriceToTick(tp_price);
   double min_stop_distance = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * pt;
   if(min_stop_distance < pt) min_stop_distance = pt;
   if(exec_signal == "EXECUTE BUY" && (sl_price >= base_ep - min_stop_distance || tp_price <= base_ep + min_stop_distance)) {
      Print("3S EA: BUY SL/TP invalid or too close to broker stop level.");
      return false;
   }
   if(exec_signal == "EXECUTE SELL" && (sl_price <= base_ep + min_stop_distance || tp_price >= base_ep - min_stop_distance)) {
      Print("3S EA: SELL SL/TP invalid or too close to broker stop level.");
      return false;
   }

   double dynamic_sl_points = MathAbs(base_ep - sl_price) / pt;
   if(dynamic_sl_points < 10) dynamic_sl_points = act_SL;
   if(dynamic_sl_points <= 0) dynamic_sl_points = 100;

   double risk_amount = AccountInfoDouble(ACCOUNT_MARGIN_FREE) * (RiskPercent / 100.0);
   double risk_per_layer = risk_amount / (TotalLayers > 0 ? TotalLayers : 1);
   double lot_per_layer = NormalizeDouble(risk_per_layer / (dynamic_sl_points * tick_value), 2);

   double min_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double max_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(min_lot <= 0) min_lot = 0.01;
   if(max_lot <= 0) max_lot = 100.0;
   if(lot_per_layer < min_lot) lot_per_layer = min_lot;
   if(lot_per_layer > max_lot) lot_per_layer = max_lot;

   if(existing_tp > 0) PrintFormat("3S EA: Setup Recovery diaktifkan. Entry %s baharu meminjam TP %f", exec_signal, existing_tp);

   PrintFormat("📊 3S EA: Menganalisa Risiko -> Total Risk: %.2f%% | Lot Per Layer: %.2f | EP: %.2f | SL: %.2f | TP: %.2f", RiskPercent, lot_per_layer, base_ep, sl_price, tp_price);

   bool any_success = false;

   for(int i=0; i<TotalLayers; i++) {
      if(exec_signal == "EXECUTE BUY") { 
double ep = NormalizePriceToTick(SymbolInfoDouble(_Symbol, SYMBOL_ASK) - (i * act_LayerSpacing * pt));
         bool res;
         if(i == 0) res = trade.Buy(lot_per_layer, _Symbol, 0.0, sl_price, tp_price, "3S MLN Buy");
         else res = trade.BuyLimit(lot_per_layer, ep, _Symbol, sl_price, tp_price, ORDER_TIME_GTC, 0, "3S MLN Buy Limit");
         
         if(res) any_success = true;
         else PrintFormat("❌ 3S EA: Broker REJECTED Buy Layer %d! Ralat Kod: %d", i, trade.ResultRetcode());
      } else { 
double ep = NormalizePriceToTick(SymbolInfoDouble(_Symbol, SYMBOL_BID) + (i * act_LayerSpacing * pt));
         bool res;
         if(i == 0) res = trade.Sell(lot_per_layer, _Symbol, 0.0, sl_price, tp_price, "3S MLN Sell");
         else res = trade.SellLimit(lot_per_layer, ep, _Symbol, sl_price, tp_price, ORDER_TIME_GTC, 0, "3S MLN Sell Limit"); 
         
         if(res) any_success = true;
         else PrintFormat("❌ 3S EA: Broker REJECTED Sell Layer %d! Ralat Kod: %d", i, trade.ResultRetcode());
      }
   }
   
   if(!any_success) {
       Print("🛑 3S EA: Semua eksekusi ditolak oleh broker! Menangguhkan sistem candle lock.");
       return false; 
   }
   
   Print("✅ 3S EA: Basket berjaya dieksekusi!");
   return true;
}

void ManageDynamicFiboTP() {
   int active_trend = 0;
   int buy_cnt = 0, sell_cnt = 0;
   
   for(int i = 0; i < PositionsTotal(); i++) {
      if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
         if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) buy_cnt++;
         else if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL) sell_cnt++;
      }
   }
   
   if(buy_cnt > 0 && sell_cnt == 0) active_trend = 1;
   else if(sell_cnt > 0 && buy_cnt == 0) active_trend = -1;
   else if(buy_cnt > 0 && sell_cnt > 0) active_trend = (buy_cnt >= sell_cnt) ? 1 : -1;

   if(!Use_Fibo_TP || active_trend == 0) {
      DrawSafeTPLine(0.0);
      DrawSafeTPOrigin(0);
      global_active_tp = 0.0;
      return;
   }

   double min_req_profit = Min_TP_Profit_USD * (Is_Cent_Account ? 100.0 : 1.0);

   bool target_found = false;
   double best_tp = 0.0;
   string best_tp_label = "";
   string tf_str = "";
   datetime best_time = 0;

   if(GetExtremeFiboTarget(h_safetp_curr, active_trend, min_req_profit, best_tp, best_tp_label, best_time, BOSTimeframe)) {
       global_active_tp = best_tp;
       tf_str = EnumToString(BOSTimeframe);
       StringReplace(tf_str, "PERIOD_", "");
       active_basket_tp_label = tf_str + " " + best_tp_label;
       target_found = true;
   }

   if(!target_found) {
       for(int i = 0; i < 6; i++) {
           if(htf_safetp_handles[i] != INVALID_HANDLE) {
               if(GetExtremeFiboTarget(htf_safetp_handles[i], active_trend, min_req_profit, best_tp, best_tp_label, best_time, htf_list[i])) {
                   global_active_tp = best_tp;
                   tf_str = EnumToString(htf_list[i]);
                   StringReplace(tf_str, "PERIOD_", "");
                   active_basket_tp_label = tf_str + " " + best_tp_label;
                   target_found = true;
                   break; 
               }
           }
       }
   }

   if(!target_found) {
       if(min_req_profit <= 0.0) {
           double buy_be = GetBasketBreakEven(POSITION_TYPE_BUY);
           double sell_be = GetBasketBreakEven(POSITION_TYPE_SELL);
           double ref_be = (active_trend == 1) ? buy_be : sell_be;
           
           if(ref_be > 0) {
               double safe_buffer = 15 * _Point; 
               global_active_tp = (active_trend == 1) ? (ref_be + safe_buffer) : (ref_be - safe_buffer);
               active_basket_tp_label = "BREAKEVEN";
               best_time = 0;
               target_found = true;
           }
       } else {
           global_active_tp = 0.0;
           active_basket_tp_label = "SCANNING FOR VALID HTF TP";
           best_time = 0;
           target_found = false;
       }
   }

   if(target_found && global_active_tp > 0) {
       DrawSafeTPLine(global_active_tp);
       DrawSafeTPOrigin(best_time);
       
       double pt = _Point;
       double norm_tp = NormalizeDouble(global_active_tp, _Digits);
       
       double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
       double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
       double stop_level = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
       if(stop_level < 15 * _Point) stop_level = 15 * _Point; 
       
       bool target_hit = false;
       if(active_trend == 1 && bid >= norm_tp) target_hit = true;
       if(active_trend == -1 && ask <= norm_tp) target_hit = true;
       
       // --- V13.90 CLOSE BY DIRECTION LOGIC ---
       if(target_hit) {
           string dir_str = (active_trend == 1) ? "BUY" : "SELL";
           PrintFormat("🎯 Safe TP (%.2f) Tercapai! Menutup posisi %s.", norm_tp, (Close_By_Direction ? dir_str : "SEMUA"));
           
           for(int i = PositionsTotal() - 1; i >= 0; i--) {
               ulong ticket = PositionGetTicket(i);
               if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
                   long type = PositionGetInteger(POSITION_TYPE);
                   if(!Close_By_Direction) {
                       trade.PositionClose(ticket);
                   } else {
                       if(active_trend == 1 && type == POSITION_TYPE_BUY) trade.PositionClose(ticket);
                       if(active_trend == -1 && type == POSITION_TYPE_SELL) trade.PositionClose(ticket);
                   }
               }
           }
           
           for(int i = OrdersTotal() - 1; i >= 0; i--) {
               ulong ticket = OrderGetTicket(i);
               if(OrderGetString(ORDER_SYMBOL) == _Symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) {
                   long type = OrderGetInteger(ORDER_TYPE);
                   if(!Close_By_Direction) {
                       trade.OrderDelete(ticket);
                   } else {
                       if(active_trend == 1 && (type == ORDER_TYPE_BUY_LIMIT || type == ORDER_TYPE_BUY_STOP)) trade.OrderDelete(ticket);
                       if(active_trend == -1 && (type == ORDER_TYPE_SELL_LIMIT || type == ORDER_TYPE_SELL_STOP)) trade.OrderDelete(ticket);
                   }
               }
           }
           return; 
       }

       for(int i = PositionsTotal() - 1; i >= 0; i--) {
          ulong ticket = PositionGetTicket(i);
          if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
             double currentTP = PositionGetDouble(POSITION_TP);
             double currentSL = PositionGetDouble(POSITION_SL);
             long type = PositionGetInteger(POSITION_TYPE);
             
             if(type == POSITION_TYPE_BUY && active_trend == 1) {
                if(norm_tp >= bid + stop_level) {
                    if(MathAbs(currentTP - norm_tp) > 5 * pt) trade.PositionModify(ticket, currentSL, norm_tp);
                }
             }
             else if(type == POSITION_TYPE_SELL && active_trend == -1) {
                if(norm_tp <= ask - stop_level) {
                    if(MathAbs(currentTP - norm_tp) > 5 * pt) trade.PositionModify(ticket, currentSL, norm_tp);
                }
             }
          }
       }

       for(int i = OrdersTotal() - 1; i >= 0; i--) {
          ulong ticket = OrderGetTicket(i);
          if(OrderGetString(ORDER_SYMBOL) == _Symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) {
             double currentTP = OrderGetDouble(ORDER_TP);
             double currentSL = OrderGetDouble(ORDER_SL);
             double openPrice = OrderGetDouble(ORDER_PRICE_OPEN);
             long type = OrderGetInteger(ORDER_TYPE);
             
             if((type == ORDER_TYPE_BUY_LIMIT || type == ORDER_TYPE_BUY_STOP) && active_trend == 1) {
                 if(norm_tp >= openPrice + stop_level) {
                     if(MathAbs(currentTP - norm_tp) > 5 * pt) trade.OrderModify(ticket, openPrice, currentSL, norm_tp, ORDER_TIME_GTC, 0);
                 }
             }
             else if((type == ORDER_TYPE_SELL_LIMIT || type == ORDER_TYPE_SELL_STOP) && active_trend == -1) {
                 if(norm_tp <= openPrice - stop_level) {
                     if(MathAbs(currentTP - norm_tp) > 5 * pt) trade.OrderModify(ticket, openPrice, currentSL, norm_tp, ORDER_TIME_GTC, 0);
                 }
             }
          }
       }
   } else {
       DrawSafeTPLine(0.0);
       DrawSafeTPOrigin(0);
   }
}

int GetTotalOrders() { 
    int c = 0; 
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) c++; 
    }
    for(int i = OrdersTotal() - 1; i >= 0; i--) {
        if(OrderGetString(ORDER_SYMBOL) == _Symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) c++; 
    }
    return c; 
}

void ManageBreakEvenAndTrailing() { 
   if(!UseBreakEven) return; 
   double pt = _Point;
   if(act_BE_Trail <= 0) act_BE_Trail = 100; 
   
   for(int i = PositionsTotal() - 1; i >= 0; i--) { 
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) { 
         
         double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
         double currentSL = PositionGetDouble(POSITION_SL);
         double currentTP = PositionGetDouble(POSITION_TP); 
         long type = PositionGetInteger(POSITION_TYPE);
         
         bool is_breakout = false;
         double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         
         if(g_fibo_tp1 > 0) {
            if(type == POSITION_TYPE_BUY)  is_breakout = (bid >= g_fibo_tp1);
            if(type == POSITION_TYPE_SELL) is_breakout = (ask <= g_fibo_tp1);
         }
         
         if(is_breakout) {
            if(type == POSITION_TYPE_BUY) { 
               double currentProfitPoints = (bid - openPrice) / pt;
               if(currentProfitPoints >= act_BE_Trigger) { 
                  int steps = (int)MathFloor((currentProfitPoints - act_BE_Trigger) / act_BE_Trail);
                  double newSL = NormalizeDouble(openPrice + (act_BE_Buffer + steps * act_BE_Trail) * pt, _Digits);
                  
                  if(currentSL < newSL || currentSL == 0) {
                     trade.PositionModify(ticket, newSL, currentTP);
                  }
               } 
            } else if(type == POSITION_TYPE_SELL) { 
               double currentProfitPoints = (openPrice - ask) / pt;
               if(currentProfitPoints >= act_BE_Trigger) { 
                  int steps = (int)MathFloor((currentProfitPoints - act_BE_Trigger) / act_BE_Trail);
                  double newSL = NormalizeDouble(openPrice - (act_BE_Buffer + steps * act_BE_Trail) * pt, _Digits);
                  
                  if(currentSL > newSL || currentSL == 0) {
                     trade.PositionModify(ticket, newSL, currentTP);
                  }
               } 
            } 
         }
      } 
   } 
}

void ManageEmergencyClose() { 
   if(!UseBailoutSystem || GetTotalOrders() == 0) return;
   
   bool closeBuyOrders = (g_score_b < EmergencyCloseScore);
   bool closeSellOrders = (g_score_s < EmergencyCloseScore); 
   
   if(!closeBuyOrders && !closeSellOrders) return;
   
   static bool buy_printed = false;
   static bool sell_printed = false;
   
   if(closeBuyOrders && !buy_printed) {
       PrintFormat("🚨 BAILOUT SYSTEM TRIGGERED: Buy Score (%d) is below Emergency Limit (%d). Liquidating all BUY positions!", g_score_b, EmergencyCloseScore);
       buy_printed = true;
   }
   if(closeSellOrders && !sell_printed) {
       PrintFormat("🚨 BAILOUT SYSTEM TRIGGERED: Sell Score (%d) is below Emergency Limit (%d). Liquidating all SELL positions!", g_score_s, EmergencyCloseScore);
       sell_printed = true;
   }
   
   if(!closeBuyOrders) buy_printed = false;
   if(!closeSellOrders) sell_printed = false;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--) { 
      ulong ticket = PositionGetTicket(i);
      if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) { 
         long type = PositionGetInteger(POSITION_TYPE);
         if(type == POSITION_TYPE_BUY && closeBuyOrders) {
             trade.PositionClose(ticket); 
             Print("Emergency Closed Active BUY Ticket: #", ticket);
         }
         else if(type == POSITION_TYPE_SELL && closeSellOrders) {
             trade.PositionClose(ticket);
             Print("Emergency Closed Active SELL Ticket: #", ticket);
         }
      } 
   } 
   
   for(int i = OrdersTotal() - 1; i >= 0; i--) { 
      ulong ticket = OrderGetTicket(i);
      if(OrderGetString(ORDER_SYMBOL) == _Symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) { 
         long type = OrderGetInteger(ORDER_TYPE);
         if((type == ORDER_TYPE_BUY_LIMIT || type == ORDER_TYPE_BUY_STOP) && closeBuyOrders) {
             trade.OrderDelete(ticket);
             Print("Emergency Deleted Pending BUY Ticket: #", ticket);
         }
         else if((type == ORDER_TYPE_SELL_LIMIT || type == ORDER_TYPE_SELL_STOP) && closeSellOrders) {
             trade.OrderDelete(ticket); 
             Print("Emergency Deleted Pending SELL Ticket: #", ticket);
         }
      } 
   } 
}

void CleanupOrphanedOrders() {
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    
    bool is_buy_be_active = false;
    bool is_sell_be_active = false;
    bool has_buy_pos = false;
    bool has_sell_pos = false;
    
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        ulong ticket = PositionGetTicket(i);
        if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
            long type = PositionGetInteger(POSITION_TYPE);
            double sl = PositionGetDouble(POSITION_SL);
            double open = PositionGetDouble(POSITION_PRICE_OPEN);
            
            if(type == POSITION_TYPE_BUY) {
                has_buy_pos = true;
                if(sl > open) is_buy_be_active = true;
            }
            if(type == POSITION_TYPE_SELL) {
                has_sell_pos = true;
                if(sl > 0 && sl < open) is_sell_be_active = true;
            }
        }
    }

    for(int i = OrdersTotal() - 1; i >= 0; i--) {
        ulong ticket = OrderGetTicket(i);
        
        if(OrderGetString(ORDER_SYMBOL) == _Symbol && OrderGetInteger(ORDER_MAGIC) == MagicNumber) {
            
            long type = OrderGetInteger(ORDER_TYPE);
            double tp = OrderGetDouble(ORDER_TP);
            double sl = OrderGetDouble(ORDER_SL);
            bool is_orphaned = false;
            
            if(type == ORDER_TYPE_BUY_LIMIT || type == ORDER_TYPE_BUY_STOP) {
                if(!has_buy_pos) is_orphaned = true; 
                else if((tp > 0 && bid >= tp) || (sl > 0 && ask <= sl) || is_buy_be_active) is_orphaned = true;
            }
            else if(type == ORDER_TYPE_SELL_LIMIT || type == ORDER_TYPE_SELL_STOP) {
                if(!has_sell_pos) is_orphaned = true; 
                else if((tp > 0 && ask <= tp) || (sl > 0 && bid >= sl) || is_sell_be_active) is_orphaned = true;
            }
            
            if(is_orphaned) {
                trade.OrderDelete(ticket);
                PrintFormat("3S EA: Pending Limit Order #%d dipadamkan (Basket Selesai).", ticket);
            }
        }
    }
}

double GetBasketBreakEven(long target_type) {
    double total_value = 0.0;
    double total_volume = 0.0;
    
    for(int i = 0; i < PositionsTotal(); i++) {
        if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber) {
            if(PositionGetInteger(POSITION_TYPE) == target_type) {
                double vol = PositionGetDouble(POSITION_VOLUME);
                double price = PositionGetDouble(POSITION_PRICE_OPEN);
                total_value += (price * vol);
                total_volume += vol;
            }
        }
    }
    return (total_volume > 0) ? (total_value / total_volume) : 0.0;
}

//+------------------------------------------------------------------+
//| API, MLN FEEDBACK, & SCREENSHOT ENGINE                           |
//+------------------------------------------------------------------+
double GetBufferValue(int handle, int buffer_num, int shift) { 
    if(handle == INVALID_HANDLE) return EMPTY_VALUE;
    double arr[1];
    if(CopyBuffer(handle, buffer_num, shift, 1, arr) > 0) return arr[0]; 
    return EMPTY_VALUE; 
}

int GetTrend(string sym, ENUM_TIMEFRAMES tf) { 
    if(sym == "") return 0; 
    double open_arr[1]; 
    if(CopyOpen(sym, tf, 0, 1, open_arr) <= 0) return 0; 
    double open = open_arr[0];
    double close = iClose(sym, tf, 0); 
    if(open == 0 || close == 0) return 0; 
    if(close >= open) return 1; 
    return -1; 
}

int GetSyntheticUSDTrend(ENUM_TIMEFRAMES tf) { 
    int net_usd_strength = 0, valid_pairs = 0, total = SymbolsTotal(false); 
    
    for(int i=0; i<3; i++) { 
        string pair = ""; 
        for(int j=0; j<total; j++) { 
            string s = SymbolName(j, false); 
            if(StringFind(s, synth_pairs_inv[i]) >= 0) { 
                pair = s; break; 
            } 
        } 
        if(pair != "") { 
            int trend = GetTrend(pair, tf); 
            if(trend != 0) { net_usd_strength -= trend; valid_pairs++; } 
        } 
    } 
    
    for(int i=0; i<3; i++) { 
        string pair = ""; 
        for(int j=0; j<total; j++) { 
            string s = SymbolName(j, false); 
            if(StringFind(s, synth_pairs_dir[i]) >= 0) { 
                pair = s; break; 
            } 
        } 
        if(pair != "") { 
            int trend = GetTrend(pair, tf); 
            if(trend != 0) { net_usd_strength += trend; valid_pairs++; } 
        } 
    } 
    
    if(valid_pairs < 3) return 0; 
    if(net_usd_strength > 0) return 1; 
    if(net_usd_strength < 0) return -1; 
    return 0; 
}

int GetDT3Signal() {
    double buy_sig = GetBufferValue(h_zz, 0, 1);
    double sell_sig = GetBufferValue(h_zz, 1, 1);
    
    if(buy_sig > 0.0 && buy_sig != EMPTY_VALUE) return 1;
    if(sell_sig > 0.0 && sell_sig != EMPTY_VALUE) return -1;
    
    return 0;
}

void FetchAllFREDData() { 
    double current_cpi = FetchFREDData("CPIAUCSL"); 
    if(current_cpi > 0) { 
        GlobalVariableSet("FRED_CPI_Actual", current_cpi); 
        api_inf_result = 2; 
    } 
    
    double current_nfp = FetchFREDData("PAYEMS"); 
    if(current_nfp > 0) { 
        GlobalVariableSet("FRED_NFP_Actual", current_nfp); 
    } 
    
    double current_rates = FetchFREDData("FEDFUNDS"); 
    if(current_rates > 0) { 
        GlobalVariableSet("FRED_RATES_Actual", current_rates); 
        api_pol_result = 2; 
    } 
    
    UpdateManualStates(); 
}

double FetchFREDData(string series_id) {
   if (FRED_API_Key == "" || FRED_API_Key == "YOUR_FRED_API_KEY") { 
       api_fr_stat = "NO KEY"; 
       return 0.0; 
   }
   
   string url = StringFormat("%s/fred/series/observations?series_id=%s&file_type=json&sort_order=desc&limit=1&api_key=%s", FRED_BASE_URL, series_id, FRED_API_Key);
   char post[], result[]; 
   string custom_headers = "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n", res_headers;
   
   int res = WebRequest("GET", url, custom_headers, 5000, post, result, res_headers);
   
   if(res == 200) {
      api_fr_stat = "OK"; 
      string json_str = CharArrayToString(result); 
      CJAVal json;
      if(json.Deserialize(json_str)) { 
          return StringToDouble(json["observations"][0]["value"].ToStr()); 
      }
   } 
   else if(res == 504) { 
       api_fr_stat = "TIMEOUT 504"; 
   }
   else { 
       api_fr_stat = StringFormat("ERR:%d", res); 
   }
   
   return 0.0;
}

void FetchTwelveData() { 
    if (TimeCurrent() - last_api_fetch < (is_api_active_mode ? API_Active_Refresh_Seconds : API_Idle_Refresh_Minutes * 60)) return; 
    if (TwelveData_API_Key == "") { api_td_stat = "NO KEY"; return; } 
    if (TimeCurrent() < api_cooldown_until) return; 
    
    string url = StringFormat("https://api.twelvedata.com/quote?symbol=%s,%s&apikey=%s", API_DXY_Symbol, API_Y10_Symbol, TwelveData_API_Key); 
    char post[], result[]; 
    string headers; 
    
    int res = WebRequest("GET", url, "", 5000, post, result, headers); 
    
    if(res == 200) { 
        api_td_stat = "OK"; 
        string json_str = CharArrayToString(result); 
        CJAVal json; 
        
        if(json.Deserialize(json_str)) { 
            api_DXY_open = StringToDouble(json[API_DXY_Symbol]["open"].ToStr()); 
            api_DXY_live = StringToDouble(json[API_DXY_Symbol]["close"].ToStr()); 
            api_y10_open = StringToDouble(json[API_Y10_Symbol]["open"].ToStr()); 
            api_y10_live = StringToDouble(json[API_Y10_Symbol]["close"].ToStr()); 
            last_api_fetch = TimeCurrent(); 
        } 
    } else { 
        api_td_stat = StringFormat("ERR:%d", res); 
    } 
}

void FetchAlphaVantageSentiment() { 
    if (AlphaVantage_API_Key == "") { api_av_stat = "NO KEY"; return; } 
    
    string url = StringFormat("https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=economy_macro&limit=15&apikey=%s", AlphaVantage_API_Key); 
    char post[], result[]; 
    string headers; 
    
    int res = WebRequest("GET", url, "", 5000, post, result, headers); 
    
    if(res == 200) { 
        string json_str = CharArrayToString(result); 
        if(StringFind(json_str, "Information") >= 0 && StringFind(json_str, "standard API call frequency") >= 0) { 
            api_av_stat = "LIMIT REACHED"; return; 
        } 
        
        CJAVal json; 
        if(json.Deserialize(json_str)) { 
            api_av_stat = "OK"; UpdateManualStates(); 
        } else { 
            api_av_stat = "JSON ERR"; 
        } 
    } else { 
        api_av_stat = StringFormat("ERR:%d", res); 
    } 
}

void FetchNativeCalendarNews() {
   static datetime last_news_check = 0;
   if(TimeCurrent() - last_news_check < Calendar_Refresh_Seconds && last_news_check != 0) return;
   
   bool show_high = true, show_med  = false, show_low  = false;
   if(GlobalVariableCheck(GVPrefix + "Filter_High")) {
      show_high = (GlobalVariableGet(GVPrefix + "Filter_High") == 1.0);
      show_med  = (GlobalVariableGet(GVPrefix + "Filter_Med") == 1.0);
      show_low  = (GlobalVariableGet(GVPrefix + "Filter_Low") == 1.0);
   }
   
   MqlCalendarValue values[]; 
   datetime now = TimeCurrent();
   
   if(CalendarValueHistory(values, now - 86400, now + 86400, NULL, "USD")) {
      datetime target_time = 0; 
      int net_score = 0, event_count = 0;

      for(int i = ArraySize(values) - 1; i >= 0; i--) {
         MqlCalendarEvent event;
         if(CalendarEventById(values[i].event_id, event)) {
            int impactLevel = 1;
            if(event.importance == CALENDAR_IMPORTANCE_HIGH) impactLevel = 3;
            else if(event.importance == CALENDAR_IMPORTANCE_MODERATE) impactLevel = 2;
            
            if(impactLevel == 3 && !show_high) continue;
            if(impactLevel == 2 && !show_med) continue;
            if(impactLevel == 1 && !show_low) continue;
            
            if(values[i].actual_value != TRADAYS_NO_VALUE && values[i].time <= now) { 
                target_time = values[i].time; 
                break; 
            }
         }
      }

      if(target_time > 0) {
         for(int i = ArraySize(values) - 1; i >= 0; i--) {
            if(values[i].time == target_time) {
               MqlCalendarEvent event;
               if(CalendarEventById(values[i].event_id, event)) {
                  int impactLevel = 1;
                  if(event.importance == CALENDAR_IMPORTANCE_HIGH) impactLevel = 3;
                  else if(event.importance == CALENDAR_IMPORTANCE_MODERATE) impactLevel = 2;
                  
                  if(impactLevel == 3 && !show_high) continue;
                  if(impactLevel == 2 && !show_med) continue;
                  if(impactLevel == 1 && !show_low) continue;
                  
                  double actual = (double)values[i].actual_value, forecast = (double)values[i].forecast_value;
                  if(forecast != TRADAYS_NO_VALUE && actual != TRADAYS_NO_VALUE) {
                     event_count++; 
                     bool is_inverse = false;
                     string lower_name = event.name; 
                     StringToLower(lower_name);
                     
                     if(StringFind(lower_name, "unemployment") >= 0 || StringFind(lower_name, "jobless") >= 0 || StringFind(lower_name, "claims") >= 0) is_inverse = true;
                     
                     if(actual > forecast) net_score += (is_inverse ? -1 : 1);
                     else if(actual < forecast) net_score += (is_inverse ? 1 : -1);
                  }
               }
            }
         }
         api_cal_stat = "OK";
         if(event_count > 0) {
            if(net_score > 0) { p1_news_str = "[OK] USD Kuat (Berita)"; p1_news_col = clrRed; }
            else if(net_score < 0) { p1_news_str = "[OK] USD Lemah (Berita)"; p1_news_col = clrLime; }
            else { p1_news_str = "BERITA MIXED"; p1_news_col = clrYellow; }
         } else { 
             p1_news_str = "BERITA TIADA FORECAST"; 
             p1_news_col = clrYellow; 
         }
      } else { 
          p1_news_str = "TIADA/MENUNGGU BERITA"; 
          p1_news_col = clrGray; 
      }
   } else { 
       api_cal_stat = "NO DATA"; 
       p1_news_str = "RALAT KALENDAR"; 
       p1_news_col = clrGray; 
   }
   last_news_check = TimeCurrent();
}

void SendMLNFeedback() {
   HistorySelect(last_feedback_time, TimeCurrent());
   int histTotal = HistoryDealsTotal();
   
   for(int i = 0; i < histTotal; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      
      if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT || entry == DEAL_ENTRY_OUT_BY) {
         if(HistoryDealGetString(ticket, DEAL_SYMBOL) == _Symbol && HistoryDealGetInteger(ticket, DEAL_MAGIC) == MagicNumber) {
            
            double net_deal = HistoryDealGetDouble(ticket, DEAL_PROFIT) + HistoryDealGetDouble(ticket, DEAL_SWAP) + HistoryDealGetDouble(ticket, DEAL_COMMISSION) + HistoryDealGetDouble(ticket, DEAL_FEE);
            CJAVal json;
            json["symbol"] = _Symbol; json["profit"] = net_deal; json["regime"] = current_regime;
            
            string payload; 
            json.Serialize(payload);
            char post[], result[]; 
            string headers = "Content-Type: application/json\r\nX-API-Key: " + g_customer_api_key + "\r\n", res_headers;
            StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
            
            int res = WebRequest("POST", MLN_Feedback_URL, headers, 5000, post, result, res_headers);
            if(res == 200) Print("3S EA: Trade outcome sent to MLN for learning. Profit: $", net_deal);
            else Print("3S EA: Failed to send feedback. Error: ", res);
            
            last_feedback_time = TimeCurrent() + 1;
         }
      }
   }
}

void TakeTradeScreenshots(string sig) {
   string s_type = (sig == "EXECUTE BUY") ? "BUY" : "SELL";
   string timeStr = TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);
   StringReplace(timeStr, ".", ""); StringReplace(timeStr, ":", ""); StringReplace(timeStr, " ", "_");
   
   string folder = "3S_Screenshots\\";
   string name1 = folder + _Symbol + "_" + EnumToString(Period()) + "_" + timeStr + "_" + s_type + "_Dash.png";
   string name2 = folder + _Symbol + "_" + EnumToString(Period()) + "_" + timeStr + "_" + s_type + "_Clean.png";

   int base_w = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS);
   int base_h = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS);
   int w = MathMax(base_w, PanelX + S(950));
   int h = MathMax(base_h, 800);

   ChartScreenShot(0, name1, w, h, ALIGN_RIGHT);

   int total_objs = ObjectsTotal(0); 
   string hidden_objs[]; 
   int h_count = 0;
   
   for(int i = 0; i < total_objs; i++) {
       string objName = ObjectName(0, i);
       if(StringFind(objName, "MLN_") >= 0 || StringFind(objName, "BTN_") >= 0) { 
           ArrayResize(hidden_objs, h_count + 1); 
           hidden_objs[h_count] = objName;
           ObjectSetInteger(0, objName, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS); 
           h_count++;
       }
   }
   
   ChartRedraw(0); Sleep(300); 
   ChartScreenShot(0, name2, w, h, ALIGN_RIGHT);

   for(int i = 0; i < h_count; i++) {
       ObjectSetInteger(0, hidden_objs[i], OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
   }
   
   InitGUI(); 
   UpdateGUI(); 
   ChartRedraw(0);
   Print("3S EA: Entry Screenshots successfully saved to MQL5\\Files\\" + folder);
}

//+------------------------------------------------------------------+
//| SUPPORT & RESISTANCE (SNR) ENGINE                                |
//+------------------------------------------------------------------+
bool DetectLevels(ENUM_TIMEFRAMES tf, int lookback, int max_levels) { 
    ArrayResize(m_levels, 0); 
    m_level_count = 0; 
    
    double high[], low[], close[], open[]; 
    datetime time[]; 
    
    ArraySetAsSeries(high, true); 
    ArraySetAsSeries(low, true); 
    ArraySetAsSeries(close, true); 
    ArraySetAsSeries(open, true); 
    ArraySetAsSeries(time, true); 
    
    if(CopyHigh(_Symbol, tf, 0, lookback, high) <= 0) return false;
    if(CopyLow(_Symbol, tf, 0, lookback, low) <= 0) return false;
    if(CopyClose(_Symbol, tf, 0, lookback, close) <= 0) return false;
    if(CopyOpen(_Symbol, tf, 0, lookback, open) <= 0) return false;
    if(CopyTime(_Symbol, tf, 0, lookback, time) <= 0) return false;
     
    int copied = ArraySize(high); 
    SLevel temp_res[], temp_sup[]; 
    int res_count = 0, sup_count = 0; 
    
    for(int i = SNR_SwingBars; i < copied - SNR_SwingBars; i++) { 
        bool is_high = true, is_low = true; 
        for(int j = 1; j <= SNR_SwingBars; j++) { 
            if(high[i] <= high[i-j] || high[i] <= high[i+j]) is_high = false; 
            if(low[i] >= low[i-j] || low[i] >= low[i+j]) is_low = false; 
        } 
        
        if(is_high) { 
            double best_bull_body = 0; 
            int best_bull_idx = -1; 
            for(int k = i; k <= i + SNR_SwingBars; k++) { 
                if(k >= 0 && k < copied) { 
                    if(close[k] > open[k]) { 
                        if(close[k] > best_bull_body) { 
                            best_bull_body = close[k]; 
                            best_bull_idx = k; 
                        } 
                    } 
                } 
            } 
            ArrayResize(temp_res, res_count + 1); 
            temp_res[res_count].price = high[i]; 
            
            if(best_bull_body > 0 && best_bull_idx != -1) { 
                temp_res[res_count].price_body = best_bull_body; 
                temp_res[res_count].time = time[best_bull_idx]; 
            } else { 
                temp_res[res_count].price_body = MathMax(open[i], close[i]); 
                temp_res[res_count].time = time[i]; 
            } 
            
            temp_res[res_count].time_broken = 0; 
            temp_res[res_count].type = TYPE_RESISTANCE; 
            temp_res[res_count].tf = tf; 
            temp_res[res_count].state = STATE_ACTIVE; 
            temp_res[res_count].rejections = 1; 
            res_count++; 
        } 
        
        if(is_low) { 
            double best_bear_body = 999999.0; 
            int best_bear_idx = -1; 
            for(int k = i; k <= i + SNR_SwingBars; k++) { 
                if(k >= 0 && k < copied) { 
                    if(close[k] < open[k]) { 
                        if(close[k] < best_bear_body) { 
                            best_bear_body = close[k]; 
                            best_bear_idx = k; 
                        } 
                    } 
                } 
            } 
            ArrayResize(temp_sup, sup_count + 1); 
            temp_sup[sup_count].price = low[i]; 
            
            if(best_bear_body < 999999.0 && best_bear_idx != -1) { 
                temp_sup[sup_count].price_body = best_bear_body; 
                temp_sup[sup_count].time = time[best_bear_idx]; 
            } else { 
                temp_sup[sup_count].price_body = MathMin(open[i], close[i]); 
                temp_sup[sup_count].time = time[i]; 
            } 
            
            temp_sup[sup_count].time_broken = 0; 
            temp_sup[sup_count].type = TYPE_SUPPORT; 
            temp_sup[sup_count].tf = tf; 
            temp_sup[sup_count].state = STATE_ACTIVE; 
            temp_sup[sup_count].rejections = 1; 
            sup_count++; 
        } 
    } 
    
    GroupLevels(temp_res, res_count, SNR_BreakoutBuffer * m_point); 
    GroupLevels(temp_sup, sup_count, SNR_BreakoutBuffer * m_point); 
    
    CheckBreakouts(temp_res, res_count, close, time); 
    CheckBreakouts(temp_sup, sup_count, close, time); 
    
    AddLevels(temp_res, res_count, max_levels); 
    AddLevels(temp_sup, sup_count, max_levels); 
    
    return true; 
}

void GroupLevels(SLevel &levels[], int &count, double threshold) { 
    for(int i = 0; i < count; i++) { 
        if(levels[i].price == 0) continue; 
        for(int j = i + 1; j < count; j++) { 
            if(levels[j].price == 0) continue; 
            if(MathAbs(levels[i].price - levels[j].price) <= threshold) { 
                levels[i].rejections++; 
                if(levels[i].type == TYPE_RESISTANCE) { 
                    if(levels[j].price_body > levels[i].price_body) { 
                        levels[i].price_body = levels[j].price_body; 
                        levels[i].time = levels[j].time; 
                        levels[i].price = MathMax(levels[i].price, levels[j].price); 
                    } 
                } 
                else { 
                    if(levels[j].price_body < levels[i].price_body) { 
                        levels[i].price_body = levels[j].price_body; 
                        levels[i].time = levels[j].time; 
                        levels[i].price = MathMin(levels[i].price, levels[j].price); 
                    } 
                } 
                levels[j].price = 0; 
            } 
        } 
    } 
    
    int new_count = 0; 
    for(int i = 0; i < count; i++) { 
        if(levels[i].price != 0) { 
            levels[new_count] = levels[i]; 
            new_count++; 
        } 
    } 
    count = new_count; 
    ArrayResize(levels, count); 
}

void CheckBreakouts(SLevel &levels[], int count, const double &close[], const datetime &time[]) { 
    double buffer = SNR_BreakoutBuffer * m_point; 
    for(int i = 0; i < count; i++) { 
        int start_idx = iBarShift(_Symbol, levels[i].tf, levels[i].time); 
        if(start_idx < 0) continue; 
        
        for(int j = start_idx - 1; j >= 0; j--) { 
            if(levels[i].type == TYPE_RESISTANCE) { 
                if(close[j] > levels[i].price + buffer) { 
                    levels[i].state = STATE_BROKEN; 
                    levels[i].time_broken = time[j]; 
                    break; 
                } 
            } 
            else if(levels[i].type == TYPE_SUPPORT) { 
                if(close[j] < levels[i].price - buffer) { 
                    levels[i].state = STATE_BROKEN; 
                    levels[i].time_broken = time[j]; 
                    break; 
                } 
            } 
        } 
    } 
}

void AddLevels(SLevel &levels[], int count, int max_levels) { 
    for(int i = 0; i < count - 1; i++) { 
        for(int j = i + 1; j < count; j++) { 
            if(levels[j].time > levels[i].time) { 
                SLevel temp = levels[i]; 
                levels[i] = levels[j]; 
                levels[j] = temp; 
            } 
        } 
    } 
    
    int limit = MathMin(count, max_levels); 
    int start_idx = m_level_count; 
    ArrayResize(m_levels, m_level_count + limit); 
    
    for(int i = 0; i < limit; i++) { 
        m_levels[start_idx + i] = levels[i]; 
        m_levels[start_idx + i].name = StringFormat("SNR_%s_%s", EnumToString(levels[i].tf), TimeToString(levels[i].time)); 
        m_level_count++; 
    } 
}

//+------------------------------------------------------------------+
//| EVENT-DRIVEN MACRO TRIGGER ENGINE                                |
//+------------------------------------------------------------------+
void CheckNewsTrigger() {
   static datetime last_triggered_time = 0;
   datetime now = TimeCurrent();
   MqlCalendarValue values[];
   
   if(CalendarValueHistory(values, now - 86400, now + 86400, NULL, "USD")) {
      for(int i = ArraySize(values) - 1; i >= 0; i--) {
         if(values[i].time <= now && values[i].time > last_triggered_time) {
            MqlCalendarEvent event;
            if(CalendarEventById(values[i].event_id, event)) {
               if(event.importance == CALENDAR_IMPORTANCE_HIGH || event.importance == CALENDAR_IMPORTANCE_MODERATE) {
                   last_triggered_time = values[i].time;
                   PingPythonForMacro(); 
                   break;
               }
            }
         }
      }
   }
}

void PingPythonForMacro() {
   char post[], result[];
   string headers = "Content-Type: application/json\r\nX-API-Key: " + g_customer_api_key + "\r\n";
   string payload = "{\"trigger\":\"news_event\"}";
   StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
   string res_headers;
   
   Print("3S EA: Waktu Berita Makro Tiba! Mengarahkan Python memuat turun data FRED terkini...");
   int status = WebRequest("POST", Macro_Trigger_URL, headers, 5000, post, result, res_headers);
   if(status != 200) Print("3S EA: Macro refresh request failed. HTTP=", status, " MT5Error=", GetLastError());
}
//+------------------------------------------------------------------+
