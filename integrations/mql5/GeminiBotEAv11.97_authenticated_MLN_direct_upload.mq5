//+------------------------------------------------------------------+
//|                                              FMCBR_Basket_EA.mq5 |
//|  Gemini Bot EA - V11.97 (Full ML + Optuna + Win Prob Dashboard)  |
//|         MULTI-PAIR, ALL-POSITION & VISUAL VERIFY ENABLED         |
//+------------------------------------------------------------------+
#property copyright "FizuxCoder"
#property version   "11.97"

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade         trade;
CTrade         emergency_trade; // 🔹 Emergency trade object for instant escape
CPositionInfo  posInfo;

// Forward declarations for JSON helpers at the bottom of the file
string ExtractJSONString(string json, string key);
double ExtractJSONDouble(string json, string key);

//--- Inputs
//=== Account & Broker Settings ===
input string   EA_Comment           = "Gemini Bot EA"; // Custom Trade Comment
input int      Magic_Number         = 77777;          // EA Magic Number
input bool     Adopt_ALL_Positions  = true;           // TRUE = Accumulate & manage ALL trades on symbol (Any Magic # / Manual)
input bool     Include_Manual_Trades= true;           // TRUE = Adopt manual trades (Magic 0) into Basket TP/SL
input bool     Auto_Cent_Detect     = true;           // Auto-detect Cent Account (USC/Cent)
input bool     Force_Cent_Mode      = false;          // Manual Cent Mode (Overrides Auto-detect)

//=== High-Impact News Breakout Engine ===
input string   InpNewsPreEntry       = "===== NEWS BREAKOUT SETTINGS =====";
input bool     Use_News_PreEntry     = true;      // Enable Pre-News Breakout Stop Orders
input string   News_GVPrefix         = "FFCal_";  // 3STradays GV Prefix
input int      Pre_News_Min_Mins     = 5;         // Min minutes before news
input int      Pre_News_Max_Mins     = 10;        // Max minutes before news
input bool     News_High_Impact_Only = true;      // Trade High Impact News Only (Level 3)
input int      News_Min_Layers       = 5;         // Force Minimum Stop Orders for News
input double   News_Eq_Threshold     = 2.0;       // Equity Threshold for Target Switch (USD)
input double   News_TP_Small_Eq      = 5.0;       // USD Target if Equity <= Threshold
input double   News_TP_Large_Eq      = 10.0;      // USD Target if Equity > Threshold
input double   News_BE_Trigger_Pips  = 0.0;       // Pips in profit to trigger News BE
input double   News_BE_Lock_Pips     = 0.0;       // Pips to lock in profit

//=== Remote API Settings ===
const string   API_URL              = "https://ruby-railroad-trimester.ngrok-free.dev/config"; // Local Python REST API URL
input double   Min_Win_Prob_Filter  = 0.0;                            // Minimum ML Win Prob to allow entries (0 to disable)

//=== Direct Marketing Screenshot Upload (draft-only portal intake) ===
input bool     Enable_Marketing_Screenshot = true;                    // Capture setup and take-profit chart evidence
input bool     Capture_Setup_Screenshot    = true;
input bool     Capture_TakeProfit_Screenshot = true;
input string   Gemini_Event_Ingest_Key    = "";                      // Dedicated portal key; never use MASTER_SERVER_SYNC_KEY
input int      Screenshot_Width           = 1280;
input int      Screenshot_Height          = 720;
input int      Screenshot_Min_Interval_Sec = 15;
input bool     Ping_Portal_On_Timer       = true;                    // Connectivity/authentication check only
input int      Ping_Interval_Sec          = 300;                    // Minimum seconds between pings
const string   GEMINI_EVENT_PORTAL_URL    = "https://fizuxea-jxctlods.manus.space/api/threads/gemini-event";
const string   GEMINI_EVENT_PING_URL      = "https://fizuxea-jxctlods.manus.space/api/threads/gemini-event/ping";
string pending_marketing_event_type = "";
string pending_marketing_event_id = "";
datetime pending_marketing_event_time = 0;
datetime last_marketing_capture_time = 0;
datetime next_marketing_retry_time = 0;
datetime last_portal_ping_time = 0;

//=== Risk & Layering ===
input bool     Use_Fixed_Lot  = false;     // Use Fixed Lot Sizing
input double   Fixed_Lot_Size = 0.01;      // Starting Fixed Lot Size
input double   RiskPerTrade   = 1;         // Auto Risk per setup (%)
input int      MaxLayers      = 3;         // Default Max limit orders in basket (Overridden by API)
input double   PipStep        = 10.0;      // Default distance between layers (Overridden by API)
input double   Pyramid_PipStep= 10.0;       // Dedicated distance for Pyramid trades

//=== Profit Target Engine ===
input bool             Use_Fibo_TP        = true;       // Enable Pure Auto-Adapting Fibo TP
input bool             Use_1272_Target    = true;       // ENABLE PRE-TP: Evaluate Fibo 1.272 as target
input bool             Compensate_Spread  = true;       // Auto-Compensate Spread for SELL TP (Visual Touch)
input double           Target_Per_Lot     = 0.0;        // USD Target per 1.00 Lot (Set 0 to Disable)
input double           Min_TP_Profit_USD  = 15.0;       // Default Minimum Basket Profit (USD) (Overridden by API)

//=== Virtual Basket Trailing Stop Engine ===
input bool     Use_Trailing_Stop = false;      // Enable Virtual Basket Trailing Stop
input double   Trail_Start_Pips  = 100.0;      // Basket profit required to activate lock (Pips)
input double   Trail_Step_Pips   = 40.0;       // Trailing distance behind current price (Pips)

//=== PA Reentry Engine (Drawdown Averaging) ===
input bool             Use_PA_Confirmation  = false;             // TRUE = Require DBD/RBR before reentry
input bool             Require_Opposite_TP  = true;              // TRUE = Wait for Opposite TP before scanning PA/Fibo
input bool             Use_MTF_Confirmation = false;             // Engine 3: Require MTF Fibo Alignment
input ENUM_TIMEFRAMES  MTF_Confirm_TF       = PERIOD_M5;         // Alignment Timeframe (e.g., M5)
input bool             Use_Micro_Base_PA    = true;              // Engine 2: Detect Consolidation Bases (No Zigzag needed)
input double           Recovery_Per_Lot     = 0;                 // Reduced Target per 1.00 Lot to exit trap (USD)
input ENUM_TIMEFRAMES  PA_Timeframe         = PERIOD_CURRENT;    // Dynamic PA Timeframe for RBR/DBD
input int              Reentry_Zigzag_Depth = 1;                 // Zigzag Swing Depth for Structural RBR/DBD
input double           Reentry_Zone_Pips    = 10.0;              // Fibo TP Zone Buffer to arm tracker (Pips)
input double           Recovery_Multiplier  = 1.5;               // True Martingale Multiplier for Reentry
input bool             Use_Hard_Stop        = false;             // Enable Emergency Cut Loss
input double           Hard_Stop_DD         = 40.0;              // Drawdown % to cut all losses

//=== MTF Structural Alignment ===
input ENUM_TIMEFRAMES Macro_Timeframe        = PERIOD_H4;        // Macro Alignment TF
input int             Macro_Fractal_Strength = 11;               // Faster H4 Fractal Detection
input ENUM_TIMEFRAMES Grand_Macro_Timeframe  = PERIOD_D1;        // Grand-Macro Alignment TF
input int             Grand_Fractal_Strength = 11;               // Faster D1 Fractal Detection
input bool            Use_Macro_Filter       = true;             // True = Trade ONLY in Macro Direction

//=== Trading Time Filter ===
input bool     UseTimeFilter  = false;     // Enable/Disable Time Filter
input int      StartHour      = 8;         
input int      StartMinute    = 0;         
input int      EndHour        = 22;        
input int      EndMinute      = 0;         

//=== Indicator Settings ===
input int      Fractal_Strength = 11;      
input double   Max_Setup_Pips   = 150.0;  
input int      Max_Fibos_Shown  = 20;        // Max history Fibos to show on chart
input int      Signal_Scan_Bars = 250;       // Max candles to look back for a breakout

//=== Trade History (ROI) Settings ===
input bool     UseCustomHistoryDates = true;                 // Enable Custom ROI Period
input datetime CustomStartDate       = D'2026.08.12 00:00';  // ROI Start Date
input datetime CustomEndDate         = D'2026.12.31 23:59';  // ROI End Date

//=== Dashboard UI Settings ===
input string   InpSepUI             = "===== DASHBOARD UI SETTINGS =====";
input int      Dashboard_X          = 20;         // Dashboard X-Offset
input int      Dashboard_Y          = 60;         // Dashboard Y-Offset

//--- Global Runtime Variables (Updated dynamically via REST API)
double runtime_Min_TP_Profit_USD = 20.0;
int    runtime_MaxLayers         = 5;
double runtime_PipStep           = 10.0;
string runtime_Regime            = "SCANNING";
double runtime_WinProb           = 0.0;
string runtime_MLStatus          = "INITIALIZING";
string runtime_MLDirection       = "NONE"; 

string runtime_LicenseStatus     = "PENDING";
string runtime_ClientName        = "Connecting...";
string runtime_Expiry            = "-";

int      fmcbr_handle;
int      fmcbr_macro_handle;
int      fmcbr_grand_handle;
int      fmcbr_mtf_handle;
double   target_multi = 1.0;
string   acc_curr = "";

// MTF Target Handles & List
ENUM_TIMEFRAMES htf_list[] = {PERIOD_M5, PERIOD_M15, PERIOD_M30, PERIOD_H1, PERIOD_H4, PERIOD_D1};
int htf_handles[6];

// Sequential Reentry States
bool     reentry_opp_tp_hit = false;
bool     reentry_pa_detected = false;
int      opp_tp_level_hit = 0; 
string   reentry_status_msg = "STANDBY";
datetime last_pa_box_time = 0; 

// Structural Box Coordinates
datetime pa_box_t1 = 0;
datetime pa_box_t2 = 0;
double   pa_box_p1 = 0.0;
double   pa_box_p2 = 0.0;

// Memory Engine
double   locked_fibo_1272 = 0.0;
double   locked_fibo_tp1 = 0.0;
double   locked_fibo_tp2 = 0.0;
double   locked_fibo_tp3 = 0.0;
double   active_basket_tp = 0.0; 
double   locked_basket_sl = 0.0; 
string   active_basket_tp_label = "WAITING";
int      locked_trend = 0; 

//+------------------------------------------------------------------+
//| NATIVE NEWS INTEGRATION (Reads 3STradays Global Variables)       |
//+------------------------------------------------------------------+
bool IsUpcomingNewsWindow()
{
    if(!Use_News_PreEntry) return false;
    datetime now = TimeCurrent();
    
    if(GlobalVariableCheck(News_GVPrefix + "USD_EventCount"))
    {
        int count = (int)GlobalVariableGet(News_GVPrefix + "USD_EventCount");
        for(int i = 0; i < count; i++)
        {
            string pfx = StringFormat("%sUSD_%d_", News_GVPrefix, i);
            if(GlobalVariableCheck(pfx + "Time") && GlobalVariableCheck(pfx + "Impact"))
            {
                datetime nTime = (datetime)GlobalVariableGet(pfx + "Time");
                int impact = (int)GlobalVariableGet(pfx + "Impact");
                
                if(News_High_Impact_Only && impact < 3) continue;
                
                long diff = (long)(nTime - now);
                if(diff >= (Pre_News_Min_Mins * 60) && diff <= (Pre_News_Max_Mins * 60)) {
                    return true;
                }
            }
        }
    }
    return false;
}

//+------------------------------------------------------------------+
//| Managed Trade Identification Helpers                             |
//+------------------------------------------------------------------+
bool IsManagedPosition()
{
    if(StringCompare(posInfo.Symbol(), _Symbol, false) != 0) return false;
    if(Adopt_ALL_Positions) return true;
    ulong m = posInfo.Magic();
    return (m == Magic_Number || (Include_Manual_Trades && m == 0));
}

bool IsManagedOrder(ulong ticket)
{
    if(StringCompare(OrderGetString(ORDER_SYMBOL), _Symbol, false) != 0) return false;
    if(Adopt_ALL_Positions) return true;
    ulong m = OrderGetInteger(ORDER_MAGIC);
    return (m == Magic_Number || (Include_Manual_Trades && m == 0));
}

bool IsManagedDeal(ulong ticket)
{
    if(StringCompare(HistoryDealGetString(ticket, DEAL_SYMBOL), _Symbol, false) != 0) return false;
    if(Adopt_ALL_Positions) return true;
    ulong m = HistoryDealGetInteger(ticket, DEAL_MAGIC);
    return (m == Magic_Number || (Include_Manual_Trades && m == 0));
}

//+------------------------------------------------------------------+
//| Visual Safe TP Gold Highlighter Engine                           |
//+------------------------------------------------------------------+
void DrawSafeTPLine(double price)
{
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

void DrawSafeTPOrigin(datetime t)
{
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

//+------------------------------------------------------------------+
//| Remote API Config Fetch Engine & License Verification            |
//+------------------------------------------------------------------+
void FetchRemoteConfig()
{
    if((bool)MQLInfoInteger(MQL_TESTER)) return; 

    static uint last_check = 0;
    uint now = GetTickCount();
    if(now - last_check < 3000) return; 
    last_check = now;

    char post[], result[];
    string headers;
    
    long account_number = AccountInfoInteger(ACCOUNT_LOGIN);
    string url_with_params = API_URL + "?symbol=" + _Symbol + "&account=" + IntegerToString(account_number);
    
    ResetLastError();
    int res = WebRequest("GET", url_with_params, NULL, NULL, 500, post, 0, result, headers);
    
    if(res == 200) {
        string json = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
        
        StringReplace(json, "\n", "");
        StringReplace(json, "\r", "");
        
        static bool lock_printed = false;
        static bool auth_printed = false;
        
        if(StringFind(json, "\"license_status\":\"LOCKED\"") >= 0 || StringFind(json, "UNAUTHORIZED") >= 0) {
            runtime_MLStatus = "🚫 ACCOUNT NOT AUTHORIZED";
            runtime_Regime = "LOCKED";
            runtime_MLDirection = "CHOPPY"; 
            runtime_LicenseStatus = "LOCKED"; 
            runtime_ClientName = "UNAUTHORIZED"; 
            
            if(!lock_printed) {
                Print("🚨 EA LOCKED: Account ", account_number, " is not authorized or subscription expired. Please contact Admin.");
                lock_printed = true;
                auth_printed = false; 
            }
            return; 
        }
        
        if(StringFind(json, "\"license_status\":\"AUTHORIZED\"") >= 0) {
            string c_name = ExtractJSONString(json, "client_name");
            string c_expiry = ExtractJSONString(json, "expiry");
            
            if(c_name == "") c_name = "Active Subscriber";
            if(c_expiry == "") c_expiry = "Unknown Date";
            
            runtime_ClientName = c_name;
            runtime_Expiry = c_expiry;
            runtime_LicenseStatus = "AUTHORIZED";

            if(!auth_printed) {
                Print("✅ LICENSE VERIFIED | Welcome: ", c_name, " | Account: ", account_number, " | Valid until: ", c_expiry);
                auth_printed = true;
                lock_printed = false; 
            }
        }
        
        double t_tp    = ExtractJSONDouble(json, "min_tp_profit");
        double t_layer = ExtractJSONDouble(json, "basket_layer");
        double t_pip   = ExtractJSONDouble(json, "pip_step");
        double t_prob  = ExtractJSONDouble(json, "win_prob");

        if(t_tp > 0)    runtime_Min_TP_Profit_USD = t_tp;
        if(t_layer > 0) runtime_MaxLayers = (int)t_layer;
        if(t_pip > 0)   runtime_PipStep = t_pip;
        if(t_prob > 0)  runtime_WinProb = t_prob;

        string t_reg = ExtractJSONString(json, "regime");
        string t_sts = ExtractJSONString(json, "ml_status");
        string t_dir = ExtractJSONString(json, "ml_direction");
        
        if(t_reg != "") runtime_Regime = t_reg;
        if(t_sts != "") runtime_MLStatus = t_sts;
        if(t_dir != "") runtime_MLDirection = t_dir;

        static string last_json = "";
        if(json != last_json && last_json != "") {
            Print("📱 Quant Brain UPDATE for ", _Symbol, ": ", json); 
        }
        last_json = json;

    } else {
        runtime_MLStatus = "⚠️ SERVER UNREACHABLE";
        
        static datetime last_err_print = 0;
        if(TimeCurrent() - last_err_print > 10) { 
            int err = GetLastError();
            if(err == 4060) {
                Print("❌ ERROR 4060: WebRequest Blocked! You must add ", API_URL, " to Tools -> Options -> Expert Advisors -> Allow WebRequest");
            } else {
                Print("❌ SERVER ERROR: HTTP ", res, " | MT5 Error: ", err);
            }
            last_err_print = TimeCurrent();
        }
    }
}

//+------------------------------------------------------------------+
//| Direct Chart Evidence Capture & Portal Upload                    |
//+------------------------------------------------------------------+
string JsonEscape(string value)
{
    StringReplace(value, "\\", "\\\\");
    StringReplace(value, "\"", "\\\"");
    StringReplace(value, "\r", "\\r");
    StringReplace(value, "\n", "\\n");
    return value;
}

string Base64Encode(uchar &data[])
{
    const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    string encoded = "";
    int length = ArraySize(data);
    for(int i = 0; i < length; i += 3)
    {
        int a = data[i];
        int b = (i + 1 < length) ? data[i + 1] : 0;
        int c = (i + 2 < length) ? data[i + 2] : 0;
        encoded += StringSubstr(alphabet, (a >> 2) & 63, 1);
        encoded += StringSubstr(alphabet, ((a & 3) << 4) | ((b >> 4) & 15), 1);
        encoded += (i + 1 < length) ? StringSubstr(alphabet, ((b & 15) << 2) | ((c >> 6) & 3), 1) : "=";
        encoded += (i + 2 < length) ? StringSubstr(alphabet, c & 63, 1) : "=";
    }
    return encoded;
}

string IsoUtc(datetime value)
{
    MqlDateTime parts;
    TimeToStruct(value, parts);
    return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", parts.year, parts.mon, parts.day, parts.hour, parts.min, parts.sec);
}

string MakeMarketingEventId(string event_type, datetime event_time)
{
    long account_number = AccountInfoInteger(ACCOUNT_LOGIN);
    return StringFormat("gemini-%I64d-%s-%s-%I64d", account_number, _Symbol, event_type, (long)event_time);
}

void PingGeminiEventPortal()
{
    if(!Ping_Portal_On_Timer || Gemini_Event_Ingest_Key == "") return;
    datetime now = TimeCurrent();
    if(last_portal_ping_time > 0 && (now - last_portal_ping_time) < Ping_Interval_Sec) return;
    last_portal_ping_time = now;

    char request_body[];
    char response_body[];
    string response_headers;
    string headers = "X-Gemini-Event-Key: " + Gemini_Event_Ingest_Key + "\r\n";
    ResetLastError();
    int status = WebRequest("GET", GEMINI_EVENT_PING_URL, headers, 5000, request_body, response_body, response_headers);
    string response_text = CharArrayToString(response_body, 0, WHOLE_ARRAY, CP_UTF8);
    if(status == 200)
        Print("Gemini event portal ping OK HTTP=", status, " response=", StringSubstr(response_text, 0, 120));
    else
        Print("Gemini event portal ping FAILED HTTP=", status, " MT5Error=", GetLastError(), " response=", StringSubstr(response_text, 0, 120));
}

void QueueMarketingScreenshot(string event_type)
{
    if(!Enable_Marketing_Screenshot) return;
    if(event_type == "setup" && !Capture_Setup_Screenshot) return;
    if(event_type == "take_profit" && !Capture_TakeProfit_Screenshot) return;
    datetime now = TimeCurrent();
    if(last_marketing_capture_time > 0 && (now - last_marketing_capture_time) < Screenshot_Min_Interval_Sec)
    {
        Print("Marketing screenshot skipped by interval guard: ", event_type);
        return;
    }
    if(pending_marketing_event_type != "")
    {
        Print("Marketing screenshot queue already contains ", pending_marketing_event_id);
        return;
    }
    pending_marketing_event_type = event_type;
    pending_marketing_event_time = now;
    pending_marketing_event_id = MakeMarketingEventId(event_type, now);
}

bool UploadMarketingScreenshot(string file_name, string event_type, string event_id, datetime event_time)
{
    if(Gemini_Event_Ingest_Key == "")
    {
        Print("Marketing screenshot not uploaded: Gemini_Event_Ingest_Key is empty.");
        return false;
    }
    int handle = FileOpen(file_name, FILE_READ | FILE_BIN);
    if(handle == INVALID_HANDLE)
    {
        Print("Marketing screenshot file open failed: ", file_name, " error=", GetLastError());
        return false;
    }
    int file_size = (int)FileSize(handle);
    if(file_size <= 0 || file_size > 8 * 1024 * 1024)
    {
        FileClose(handle);
        Print("Marketing screenshot rejected locally due to size: ", file_size);
        return false;
    }
    uchar bytes[];
    ArrayResize(bytes, file_size);
    uint bytes_read = FileReadArray(handle, bytes, 0, file_size);
    FileClose(handle);
    if(bytes_read != (uint)file_size) return false;

    string payload = "{\"eventId\":\"" + JsonEscape(event_id) + "\",\"eventType\":\"" + JsonEscape(event_type) + "\",\"screenshotMimeType\":\"image/png\",\"screenshotBase64\":\"" + Base64Encode(bytes) + "\",\"occurredAt\":\"" + IsoUtc(event_time) + "\",\"accountLabel\":\"Gemini Bot EA\",\"symbol\":\"" + JsonEscape(_Symbol) + "\"}";
    char request_body[];
    char response_body[];
    string response_headers;
    StringToCharArray(payload, request_body, 0, WHOLE_ARRAY, CP_UTF8);
    if(ArraySize(request_body) > 0) ArrayResize(request_body, ArraySize(request_body) - 1);
    string headers = "Content-Type: application/json\r\nX-Gemini-Event-Key: " + Gemini_Event_Ingest_Key + "\r\n";
    ResetLastError();
    int status = WebRequest("POST", GEMINI_EVENT_PORTAL_URL, headers, 5000, request_body, response_body, response_headers);
    string response_text = CharArrayToString(response_body, 0, WHOLE_ARRAY, CP_UTF8);
    Print("Marketing screenshot upload event=", event_id, " HTTP=", status, " response=", StringSubstr(response_text, 0, 180));
    if(status == 201 || status == 200)
    {
        FileDelete(file_name);
        return true;
    }
    return false;
}

void ProcessMarketingScreenshotQueue()
{
    if(pending_marketing_event_type == "") return;
    if(next_marketing_retry_time > 0 && TimeCurrent() < next_marketing_retry_time) return;
    string event_type = pending_marketing_event_type;
    string event_id = pending_marketing_event_id;
    datetime event_time = pending_marketing_event_time;
    string file_name = "GeminiBotMarketing_" + event_id + ".png";
    if(!ChartScreenShot(0, file_name, Screenshot_Width, Screenshot_Height, ALIGN_RIGHT))
    {
        Print("Marketing ChartScreenShot failed for event=", event_id, " error=", GetLastError());
        pending_marketing_event_type = "";
        pending_marketing_event_id = "";
        return;
    }
    ChartRedraw();
    bool uploaded = UploadMarketingScreenshot(file_name, event_type, event_id, event_time);
    if(!uploaded)
    {
        // One immediate retry with the same id preserves portal idempotency.
        uploaded = UploadMarketingScreenshot(file_name, event_type, event_id, event_time);
    }
    if(!uploaded)
    {
        next_marketing_retry_time = TimeCurrent() + 30;
        Print("Marketing screenshot retained for retry with the same event id: ", event_id);
        return;
    }
    last_marketing_capture_time = TimeCurrent();
    next_marketing_retry_time = 0;
    pending_marketing_event_type = "";
    pending_marketing_event_id = "";
    pending_marketing_event_time = 0;
}

//+------------------------------------------------------------------+
//| Initialization & Broker Setup                                    |
//+------------------------------------------------------------------+
int OnInit()
{
    trade.SetExpertMagicNumber(Magic_Number);
    emergency_trade.SetExpertMagicNumber(Magic_Number);
    
    runtime_Min_TP_Profit_USD = Min_TP_Profit_USD;
    runtime_MaxLayers         = MaxLayers;
    runtime_PipStep           = PipStep;
    
    acc_curr = AccountInfoString(ACCOUNT_CURRENCY);
    string check_curr = acc_curr;
    StringToUpper(check_curr);
    
    if(Force_Cent_Mode || (Auto_Cent_Detect && (StringFind(check_curr, "USC") >= 0 || StringFind(check_curr, "CENT") >= 0))) {
        target_multi = 100.0;
        Print("CENT ENGINE: Multiplier Active.");
    } else {
        target_multi = 1.0;
    }

    bool is_tester = (bool)MQLInfoInteger(MQL_TESTER);
    
    fmcbr_handle       = iCustom(_Symbol, _Period, "FMCBR - Fractal_fixed", is_tester, Fractal_Strength); 
    fmcbr_macro_handle = iCustom(_Symbol, Macro_Timeframe, "FMCBR - Fractal_fixed", false, Macro_Fractal_Strength); 
    fmcbr_grand_handle = iCustom(_Symbol, Grand_Macro_Timeframe, "FMCBR - Fractal_fixed", false, Grand_Fractal_Strength); 
    fmcbr_mtf_handle   = iCustom(_Symbol, MTF_Confirm_TF, "FMCBR - Fractal_fixed", is_tester, Fractal_Strength); 

    for(int i = 0; i < 6; i++) {
        if(htf_list[i] > _Period) { 
            htf_handles[i] = iCustom(_Symbol, htf_list[i], "FMCBR - Fractal_fixed", is_tester, Fractal_Strength);
        } else {
            htf_handles[i] = INVALID_HANDLE;
        }
    }

    if(fmcbr_handle == INVALID_HANDLE || fmcbr_macro_handle == INVALID_HANDLE || fmcbr_grand_handle == INVALID_HANDLE || fmcbr_mtf_handle == INVALID_HANDLE) return(INIT_FAILED);
    
    DrawDashboard();
    EventSetTimer(1); 
    
    return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
    EventKillTimer(); 
    DeleteDashboard();
    DrawSafeTPLine(0.0); 
    DrawSafeTPOrigin(0);
    
    if(fmcbr_handle != INVALID_HANDLE) IndicatorRelease(fmcbr_handle);
    if(fmcbr_macro_handle != INVALID_HANDLE) IndicatorRelease(fmcbr_macro_handle);
    if(fmcbr_grand_handle != INVALID_HANDLE) IndicatorRelease(fmcbr_grand_handle);
    if(fmcbr_mtf_handle != INVALID_HANDLE) IndicatorRelease(fmcbr_mtf_handle);
    
    for(int i = 0; i < 6; i++) {
        if(htf_handles[i] != INVALID_HANDLE) IndicatorRelease(htf_handles[i]);
    }
}

//+------------------------------------------------------------------+
//| TIMER LEVEL REFRESH                                              |
//+------------------------------------------------------------------+
void OnTimer()
{
    PingGeminiEventPortal();
    FetchRemoteConfig();
    UpdateDynamicFiboTP();
    UpdateDashboard();
    ChartRedraw();
    ProcessMarketingScreenshotQueue();
}

//+------------------------------------------------------------------+
//| HARD TICK-LEVEL PROFIT MONITOR (Instantly Closes in Profit)      |
//+------------------------------------------------------------------+
void TickLevel_SafeTP_Escape()
{
    double current_basket_profit = 0.0;
    int active_trades = 0;
    bool is_news_basket = false;
    
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(posInfo.SelectByIndex(i) && IsManagedPosition())
        {
            current_basket_profit += posInfo.Profit() + posInfo.Swap() + posInfo.Commission();
            active_trades++;
            if(StringFind(posInfo.Comment(), "News_Breakout") >= 0) is_news_basket = true;
        }
    }

    double escape_target = runtime_Min_TP_Profit_USD * target_multi;
    
    if(is_news_basket) {
        double eq = AccountInfoDouble(ACCOUNT_EQUITY);
        escape_target = (eq <= News_Eq_Threshold) ? (News_TP_Small_Eq * target_multi) : (News_TP_Large_Eq * target_multi);
    }
    
    if(active_trades > 0 && current_basket_profit >= escape_target && escape_target > 0) 
    {
        Print("🚨 IMMEDIATE SAFE TP ESCAPE TRIGGERED! Basket Profit: +$", DoubleToString(current_basket_profit, 2));
        
        for(int i = PositionsTotal() - 1; i >= 0; i--)
        {
            if(posInfo.SelectByIndex(i) && IsManagedPosition())
            {
                emergency_trade.PositionClose(posInfo.Ticket());
            }
        }
        
        for(int j = OrdersTotal() - 1; j >= 0; j--) {
            ulong ticket = OrderGetTicket(j); 
            if(ticket > 0 && IsManagedOrder(ticket)) {
                emergency_trade.OrderDelete(ticket);
            }
        }
        
        locked_basket_sl = 0.0; 
        DrawSafeTPLine(0.0); 
        DrawSafeTPOrigin(0);
        
        Print("✅ BASKET SUCCESSFULLY CLOSED. EA is now safe.");
        QueueMarketingScreenshot("take_profit");
    }
}

//+------------------------------------------------------------------+
//| NEWS BREAK-EVEN (+10 PIPS LOCK)                                  |
//+------------------------------------------------------------------+
void ManageNewsBE()
{
    double pt = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    double trigger_pts = News_BE_Trigger_Pips * 10 * pt;
    double lock_pts = News_BE_Lock_Pips * 10 * pt;
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            if(StringFind(posInfo.Comment(), "News_Breakout") >= 0) {
                double open = posInfo.PriceOpen();
                double sl = posInfo.StopLoss();
                
                if(posInfo.PositionType() == POSITION_TYPE_BUY) {
                    if(bid - open >= trigger_pts) {
                        double new_sl = open + lock_pts;
                        if(sl < new_sl || sl == 0) trade.PositionModify(posInfo.Ticket(), new_sl, posInfo.TakeProfit());
                    }
                } else if(posInfo.PositionType() == POSITION_TYPE_SELL) {
                    if(open - ask >= trigger_pts) {
                        double new_sl = open - lock_pts;
                        if(sl > new_sl || sl == 0) trade.PositionModify(posInfo.Ticket(), new_sl, posInfo.TakeProfit());
                    }
                }
            }
        }
    }
}

void OnTick()
{
    TickLevel_SafeTP_Escape();

    ForceUIForeground(); 
    FetchRemoteConfig(); 
    
    bool has_active_trades = false;
    for(int i = 0; i < PositionsTotal(); i++) { 
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) has_active_trades = true; 
    }
    for(int i = 0; i < OrdersTotal(); i++) { 
        ulong t = OrderGetTicket(i);
        if(t > 0 && IsManagedOrder(t)) has_active_trades = true; 
    }

    static int empty_ticks = 0;
    if(!has_active_trades)
    {
        empty_ticks++;
        if(empty_ticks >= 3) 
        {
            locked_fibo_1272 = 0.0;
            locked_fibo_tp1 = 0.0;
            locked_fibo_tp2 = 0.0;
            locked_fibo_tp3 = 0.0;
            active_basket_tp = 0.0;
            locked_basket_sl = 0.0; 
            active_basket_tp_label = "WAITING";
            locked_trend = 0;
            reentry_opp_tp_hit = false;
            reentry_pa_detected = false;
            opp_tp_level_hit = 0;
            reentry_status_msg = "STANDBY";
            last_pa_box_time = 0; 
            
            DrawSafeTPLine(0.0);
            DrawSafeTPOrigin(0);
        }
    }
    else
    {
        empty_ticks = 0; 
        
        int buy_cnt = 0, sell_cnt = 0;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
                if(posInfo.PositionType() == POSITION_TYPE_BUY) buy_cnt++;
                else if(posInfo.PositionType() == POSITION_TYPE_SELL) sell_cnt++;
            }
        }
        if(sell_cnt > 0 && buy_cnt == 0) locked_trend = -1;
        else if(buy_cnt > 0 && sell_cnt == 0) locked_trend = 1;
        else if(buy_cnt > 0 && sell_cnt > 0) locked_trend = (buy_cnt >= sell_cnt) ? 1 : -1;
    }

    TrackReentrySequence(); 

    int active_pos = 0;
    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) active_pos++;
    }

    int pending_limits = 0, pending_stops = 0;
    string pending_dir = "";

    for(int i = 0; i < OrdersTotal(); i++) {
        ulong t = OrderGetTicket(i);
        if(t > 0 && IsManagedOrder(t)) {
            long type = OrderGetInteger(ORDER_TYPE);
            if(type == ORDER_TYPE_BUY_LIMIT) { pending_limits++; pending_dir = "BUY"; }
            else if(type == ORDER_TYPE_SELL_LIMIT) { pending_limits++; pending_dir = "SELL"; }
            else if(type == ORDER_TYPE_BUY_STOP) { pending_stops++; pending_dir = "BUY"; }
            else if(type == ORDER_TYPE_SELL_STOP) { pending_stops++; pending_dir = "SELL"; }
        }
    }

    if(pending_stops > 0) {
        reentry_status_msg = StringFormat("🚀 NEWS ARMED: WAITING %s BREAKOUT", pending_dir);
    }
    else if(pending_limits > 0) {
        if(active_pos > 0) {
            reentry_status_msg = StringFormat("⏳ SCALING IN: WAITING %s PULLBACK", pending_dir);
        } else {
            reentry_status_msg = StringFormat("⏳ FIBO LOCKED: WAITING %s PULLBACK", pending_dir);
        }
    }
    else if(active_pos > 0) {
        if(StringFind(reentry_status_msg, "ARMED") < 0 && 
           StringFind(reentry_status_msg, "SCANNING FOR") < 0 && 
           StringFind(reentry_status_msg, "OPPOSITE TP") < 0 &&
           StringFind(reentry_status_msg, "ALIGN") < 0) 
        {
            reentry_status_msg = "📈 BASKET ACTIVE: MONITORING PROFIT/TP";
        }
    }
    else {
        reentry_status_msg = "🔍 STANDBY: SCANNING FOR NEW FIBO";
    }

    UpdateDynamicFiboTP(); 
    ManageTrailingStop();
    ManageNewsBE();
    UpdateDashboard();
    ManageBasketProfit();    
    ManageInvisibleTP();     
    CheckPendingInvalidation(); 
    CleanOldFibos(); 
    CleanOldPABoxes();
    ScanForSetup(); 
}

void ForceUIForeground()
{
    static datetime last_check = 0;
    datetime now = TimeCurrent();
    if(now == last_check) return;
    last_check = now;
    
    int total = ObjectsTotal(0);
    for(int i = 0; i < total; i++) {
        string name = ObjectName(0, i);
        if(StringFind(name, "GBUI_") == -1 && StringFind(name, "GBUI_SafeTP_") == -1 && StringFind(name, "MYT_Dash_") == -1) 
        {
            if(ObjectGetInteger(0, name, OBJPROP_BACK) == false) {
                ObjectSetInteger(0, name, OBJPROP_BACK, true);
            }
        }
    }
}

//+------------------------------------------------------------------+
//| Dynamic Macro Trend Detection Engine (H4 & D1 Support - HARDENED)|
//+------------------------------------------------------------------+
string GetMacroTrend(int handle)
{
    if(handle == INVALID_HANDLE) return "NO DATA";

    int scan_bars = Signal_Scan_Bars;
    if(scan_bars < 50) scan_bars = 50;

    double b_hi[], b_low[];
    ArraySetAsSeries(b_hi, true);
    ArraySetAsSeries(b_low, true);

    int c_hi = CopyBuffer(handle, 4, 0, scan_bars, b_hi);
    int c_lo = CopyBuffer(handle, 5, 0, scan_bars, b_low);

    if(c_hi > 1 && c_lo > 1)
    {
        int limit = (int)MathMin(c_hi, c_lo);
        
        for(int i = 1; i < limit; i++)
        {
            bool is_buy  = (b_hi[i] > 0.0  && b_hi[i]  != EMPTY_VALUE && b_hi[i]  < 999999.0);
            bool is_sell = (b_low[i] > 0.0 && b_low[i] != EMPTY_VALUE && b_low[i] < 999999.0);

            if(is_buy && !is_sell) return "BULLISH";
            if(is_sell && !is_buy) return "BEARISH";
            if(is_buy && is_sell)  return "NEUTRAL";
        }
    }

    double m_up[], m_dn[];
    ArraySetAsSeries(m_up, true);
    ArraySetAsSeries(m_dn, true);

    int c_mup = CopyBuffer(handle, 8, 0, scan_bars, m_up);
    int c_mdn = CopyBuffer(handle, 10, 0, scan_bars, m_dn);

    if(c_mup > 1 && c_mdn > 1)
    {
        int limit = (int)MathMin(c_mup, c_mdn);
        for(int i = 1; i < limit; i++)
        {
            bool is_mup = (m_up[i] > 0.0 && m_up[i] != EMPTY_VALUE && m_up[i] < 999999.0);
            bool is_mdn = (m_dn[i] > 0.0 && m_dn[i] != EMPTY_VALUE && m_dn[i] < 999999.0);

            if(is_mup && !is_mdn) return "BULLISH";
            if(is_mdn && !is_mup) return "BEARISH";
        }
    }

    return "NEUTRAL";
}

//+------------------------------------------------------------------+
//| Pullback Exhaustion TP Scanner (HARDENED)                       |
//+------------------------------------------------------------------+
double GetMacroPreTP(int handle, string trend_dir)
{
    if(handle == INVALID_HANDLE) return 0.0;

    int scan_bars = Signal_Scan_Bars;
    if(scan_bars < 50) scan_bars = 50;

    if(trend_dir == "BULLISH") {
        double tp1[]; ArraySetAsSeries(tp1, true);
        int copied = CopyBuffer(handle, 12, 0, scan_bars, tp1);
        if(copied > 1) {
            for(int i = 1; i < copied; i++) {
                if(tp1[i] > 0.0 && tp1[i] != EMPTY_VALUE && tp1[i] < 999999.0) return tp1[i];
            }
        }
    }
    else if(trend_dir == "BEARISH") {
        double tp1[]; ArraySetAsSeries(tp1, true);
        int copied = CopyBuffer(handle, 15, 0, scan_bars, tp1);
        if(copied > 1) {
            for(int i = 1; i < copied; i++) {
                if(tp1[i] > 0.0 && tp1[i] != EMPTY_VALUE && tp1[i] < 999999.0) return tp1[i];
            }
        }
    }
    return 0.0;
}

int GetSwings(double &p[], datetime &t[], int &type[])
{
    int count = 0;
    int last_type = 0;
    
    for(int i = 1; i < 500 && count < 3; i++)
    {
        double h = iHigh(_Symbol, PA_Timeframe, i);
        double l = iLow(_Symbol, PA_Timeframe, i);
        
        bool is_high = true;
        bool is_low = true;
        
        for(int j = 1; j <= Reentry_Zigzag_Depth; j++) {
            if(iHigh(_Symbol, PA_Timeframe, i+j) > h) is_high = false;
            if(i-j > 0 && iHigh(_Symbol, PA_Timeframe, i-j) > h) is_high = false;
            
            if(iLow(_Symbol, PA_Timeframe, i+j) < l) is_low = false;
            if(i-j > 0 && iLow(_Symbol, PA_Timeframe, i-j) < l) is_low = false;
        }
        
        if(is_high && last_type != 1) {
            p[count] = h; t[count] = iTime(_Symbol, PA_Timeframe, i); type[count] = 1;
            last_type = 1; count++;
        }
        else if(is_low && last_type != -1) {
            p[count] = l; t[count] = iTime(_Symbol, PA_Timeframe, i); type[count] = -1;
            last_type = -1; count++;
        }
    }
    return count;
}

bool DetectRBR()
{
    double p[3]; datetime t[3]; int type[3];
    if(GetSwings(p, t, type) < 3) return false;
    
    if(type[0] == -1 && type[1] == 1 && type[2] == -1) {
        if(p[0] > p[2]) { 
            if(iClose(_Symbol, PA_Timeframe, 1) > p[1]) { 
                pa_box_t1 = t[2];
                pa_box_t2 = iTime(_Symbol, PA_Timeframe, 1);
                pa_box_p1 = p[2]; 
                pa_box_p2 = iHigh(_Symbol, PA_Timeframe, 1); 
                return true;
            }
        }
    }
    return false;
}

bool DetectDBD()
{
    double p[3]; datetime t[3]; int type[3];
    if(GetSwings(p, t, type) < 3) return false;
    
    if(type[0] == 1 && type[1] == -1 && type[2] == 1) {
        if(p[0] < p[2]) { 
            if(iClose(_Symbol, PA_Timeframe, 1) < p[1]) { 
                pa_box_t1 = t[2];
                pa_box_t2 = iTime(_Symbol, PA_Timeframe, 1);
                pa_box_p1 = p[2]; 
                pa_box_p2 = iLow(_Symbol, PA_Timeframe, 1); 
                return true;
            }
        }
    }
    return false;
}

bool DetectMicroRBR()
{
    if(iClose(_Symbol, PA_Timeframe, 1) <= iOpen(_Symbol, PA_Timeframe, 1)) return false; 
    
    for(int base_len = 1; base_len <= 4; base_len++)
    {
        int pole_idx = 1 + base_len; 
        if(iClose(_Symbol, PA_Timeframe, pole_idx + 1) <= iOpen(_Symbol, PA_Timeframe, pole_idx + 1)) continue; 
        
        double base_high = 0.0;
        double base_low = 999999.0;
        
        for(int i = 2; i <= 1 + base_len; i++) {
            if(iHigh(_Symbol, PA_Timeframe, i) > base_high) base_high = iHigh(_Symbol, PA_Timeframe, i);
            if(iLow(_Symbol, PA_Timeframe, i) < base_low) base_low = iLow(_Symbol, PA_Timeframe, i);
        }
        
        double pole_size = iHigh(_Symbol, PA_Timeframe, pole_idx + 1) - iLow(_Symbol, PA_Timeframe, pole_idx + 1);
        double base_size = base_high - base_low;
        
        if(iClose(_Symbol, PA_Timeframe, 1) > base_high && base_size <= pole_size * 1.5) 
        {
            pa_box_t1 = iTime(_Symbol, PA_Timeframe, pole_idx + 1);
            pa_box_t2 = iTime(_Symbol, PA_Timeframe, 1);
            pa_box_p1 = base_low; 
            pa_box_p2 = iHigh(_Symbol, PA_Timeframe, 1); 
            return true;
        }
    }
    return false;
}

bool DetectMicroDBD()
{
    if(iClose(_Symbol, PA_Timeframe, 1) >= iOpen(_Symbol, PA_Timeframe, 1)) return false; 
    
    for(int base_len = 1; base_len <= 4; base_len++)
    {
        int pole_idx = 1 + base_len; 
        if(iClose(_Symbol, PA_Timeframe, pole_idx + 1) >= iOpen(_Symbol, PA_Timeframe, pole_idx + 1)) continue; 
        
        double base_high = 0.0;
        double base_low = 999999.0;
        
        for(int i = 2; i <= 1 + base_len; i++) {
            if(iHigh(_Symbol, PA_Timeframe, i) > base_high) base_high = iHigh(_Symbol, PA_Timeframe, i);
            if(iLow(_Symbol, PA_Timeframe, i) < base_low) base_low = iLow(_Symbol, PA_Timeframe, i);
        }
        
        double pole_size = iHigh(_Symbol, PA_Timeframe, pole_idx + 1) - iLow(_Symbol, PA_Timeframe, pole_idx + 1);
        double base_size = base_high - base_low;
        
        if(iClose(_Symbol, PA_Timeframe, 1) < base_low && base_size <= pole_size * 1.5) 
        {
            pa_box_t1 = iTime(_Symbol, PA_Timeframe, pole_idx + 1);
            pa_box_t2 = iTime(_Symbol, PA_Timeframe, 1);
            pa_box_p1 = base_high; 
            pa_box_p2 = iLow(_Symbol, PA_Timeframe, 1); 
            return true;
        }
    }
    return false;
}

void DrawPABox(int pos_type)
{
    string obj_name = "PA_BOX_" + TimeToString(pa_box_t2);
    ObjectCreate(0, obj_name, OBJ_RECTANGLE, 0, pa_box_t1, pa_box_p2, pa_box_t2, pa_box_p1);
    
    if(pos_type == POSITION_TYPE_BUY) {
        ObjectSetInteger(0, obj_name, OBJPROP_COLOR, clrLime);
    } else {
        ObjectSetInteger(0, obj_name, OBJPROP_COLOR, clrCrimson);
    }
    
    ObjectSetInteger(0, obj_name, OBJPROP_BACK, true);
    ObjectSetInteger(0, obj_name, OBJPROP_FILL, false); 
    ObjectSetInteger(0, obj_name, OBJPROP_WIDTH, 2);    
}

void TrackReentrySequence()
{
    int pos_type = -1;
    for(int i = 0; i < PositionsTotal(); i++)
    {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            pos_type = (int)posInfo.PositionType(); break;
        }
    }
    if(pos_type == -1) return;

    if(Require_Opposite_TP)
    {
        bool mtf_aligned = true;
        if(Use_MTF_Confirmation) {
            mtf_aligned = false;
            double mtf_up[], mtf_dn[];
            ArraySetAsSeries(mtf_up, true); ArraySetAsSeries(mtf_dn, true);
            
            int c_up = CopyBuffer(fmcbr_mtf_handle, 8, 0, 200, mtf_up);
            int c_dn = CopyBuffer(fmcbr_mtf_handle, 10, 0, 200, mtf_dn);
            
            if(c_up > 0 && c_dn > 0) {
                int limit = (int)MathMin(c_up, c_dn);
                for(int i = 0; i < limit; i++) {
                    if(pos_type == POSITION_TYPE_BUY) { 
                        if(mtf_dn[i] > 0.0) { mtf_aligned = true; break; }  
                        if(mtf_up[i] > 0.0) { mtf_aligned = false; break; } 
                    } else if(pos_type == POSITION_TYPE_SELL) { 
                        if(mtf_up[i] > 0.0) { mtf_aligned = true; break; }  
                        if(mtf_dn[i] > 0.0) { mtf_aligned = false; break; } 
                    }
                }
            }
        }

        double opp_tp1 = 0.0, opp_tp2 = 0.0, opp_tp3 = 0.0;
        bool tp_price_hit = false;
        
        if(pos_type == POSITION_TYPE_BUY) 
        {
            double mula_dn[], tp1_dn[], tp2_dn[], tp3_dn[];
            
            ArraySetAsSeries(mula_dn, true); ArraySetAsSeries(tp1_dn, true);
            ArraySetAsSeries(tp2_dn, true); ArraySetAsSeries(tp3_dn, true);
            
            int c1 = CopyBuffer(fmcbr_handle, 10, 0, 1000, mula_dn);
            int c2 = CopyBuffer(fmcbr_handle, 15, 0, 1000, tp1_dn);
            int c3 = CopyBuffer(fmcbr_handle, 16, 0, 1000, tp2_dn);
            int c4 = CopyBuffer(fmcbr_handle, 17, 0, 1000, tp3_dn);
            
            if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0)
            {
                int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
                for(int i = 0; i < limit; i++) {
                    if(mula_dn[i] > 0.0) {
                        opp_tp1 = tp1_dn[i]; opp_tp2 = tp2_dn[i]; opp_tp3 = tp3_dn[i];
                        break; 
                    }
                }
            }
        }
        else if(pos_type == POSITION_TYPE_SELL) 
        {
            double mula_up[], tp1_up[], tp2_up[], tp3_up[];
            
            ArraySetAsSeries(mula_up, true); ArraySetAsSeries(tp1_up, true);
            ArraySetAsSeries(tp2_up, true); ArraySetAsSeries(tp3_up, true);
            
            int c1 = CopyBuffer(fmcbr_handle, 8, 0, 1000, mula_up);
            int c2 = CopyBuffer(fmcbr_handle, 12, 0, 1000, tp1_up);
            int c3 = CopyBuffer(fmcbr_handle, 13, 0, 1000, tp2_up);
            int c4 = CopyBuffer(fmcbr_handle, 14, 0, 1000, tp3_up);
            
            if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0)
            {
                int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
                for(int i = 0; i < limit; i++) {
                    if(mula_up[i] > 0.0) {
                        opp_tp1 = tp1_up[i]; opp_tp2 = tp2_up[i]; opp_tp3 = tp3_up[i];
                        break; 
                    }
                }
            }
        }
        
        if(opp_tp1 != 0.0) 
        {
            double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
            double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
            double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
            double zone_buffer = Reentry_Zone_Pips * 10 * point; 
            
            if(pos_type == POSITION_TYPE_BUY) {
                if(bid <= opp_tp3 + zone_buffer) { opp_tp_level_hit = 3; tp_price_hit = true; }
                else if(bid <= opp_tp2 + zone_buffer) { opp_tp_level_hit = 2; tp_price_hit = true; }
                else if(bid <= opp_tp1 + zone_buffer) { opp_tp_level_hit = 1; tp_price_hit = true; }
            }
            else if(pos_type == POSITION_TYPE_SELL) {
                if(ask >= opp_tp3 - zone_buffer) { opp_tp_level_hit = 3; tp_price_hit = true; }
                else if(ask >= opp_tp2 - zone_buffer) { opp_tp_level_hit = 2; tp_price_hit = true; }
                else if(ask >= opp_tp1 - zone_buffer) { opp_tp_level_hit = 1; tp_price_hit = true; }
            }
            
            if(tp_price_hit && Use_MTF_Confirmation && !mtf_aligned) {
                opp_tp_level_hit = 0; 
            }
        }
        reentry_opp_tp_hit = (opp_tp_level_hit > 0);
        
        if(!reentry_opp_tp_hit) 
        {
            if(tp_price_hit && Use_MTF_Confirmation && !mtf_aligned) {
                string tf_str = EnumToString(MTF_Confirm_TF);
                StringReplace(tf_str, "PERIOD_", "");
                reentry_status_msg = "M1 HIT: WAITING " + tf_str + " ALIGN";
            } else {
                reentry_status_msg = "WAITING FOR OPPOSITE TP";
            }
        }
        else if(reentry_opp_tp_hit && !reentry_pa_detected) 
        {
            if(!Use_PA_Confirmation)
            {
                reentry_pa_detected = true;
                string dir = (pos_type == POSITION_TYPE_BUY) ? "BULLISH" : "BEARISH";
                reentry_status_msg = StringFormat("PA BYPASSED: WAITING %s FIBO", dir);
            }
            else
            {
                string pa_target = (pos_type == POSITION_TYPE_BUY) ? "R.B.R" : "D.B.D";
                reentry_status_msg = StringFormat("ZONE TP%d HIT: SCANNING FOR %s", opp_tp_level_hit, pa_target);
                
                bool rbr_detected = DetectRBR() || (Use_Micro_Base_PA && DetectMicroRBR());
                bool dbd_detected = DetectDBD() || (Use_Micro_Base_PA && DetectMicroDBD());
                
                if(pos_type == POSITION_TYPE_BUY && rbr_detected) {
                    if(pa_box_t2 != last_pa_box_time) {
                        reentry_pa_detected = true;
                        last_pa_box_time = pa_box_t2; 
                        DrawPABox(POSITION_TYPE_BUY);
                    }
                }
                if(pos_type == POSITION_TYPE_SELL && dbd_detected) {
                    if(pa_box_t2 != last_pa_box_time) {
                        reentry_pa_detected = true;
                        last_pa_box_time = pa_box_t2; 
                        DrawPABox(POSITION_TYPE_SELL);
                    }
                }
            }
        }
        else if(reentry_opp_tp_hit && reentry_pa_detected)
        {
            if(!Use_PA_Confirmation)
            {
                string dir = (pos_type == POSITION_TYPE_BUY) ? "BULLISH" : "BEARISH";
                reentry_status_msg = StringFormat("PA BYPASSED: WAITING %s FIBO", dir);
            }
            else
            {
                string pa_target = (pos_type == POSITION_TYPE_BUY) ? "R.B.R" : "D.B.D";
                reentry_status_msg = StringFormat("ARMED %s (ZONE %d): WAITING FIBO", pa_target, opp_tp_level_hit);
            }
        }
    }
    else
    {
        reentry_opp_tp_hit = true; 
        if(!reentry_pa_detected) 
        {
            if(!Use_PA_Confirmation)
            {
                reentry_pa_detected = true;
                string dir = (pos_type == POSITION_TYPE_BUY) ? "BULLISH" : "BEARISH";
                reentry_status_msg = StringFormat("PA BYPASSED: WAITING %s FIBO", dir);
            }
            else
            {
                string pa_target = (pos_type == POSITION_TYPE_BUY) ? "R.B.R" : "D.B.D";
                reentry_status_msg = StringFormat("DD ACTIVE: SCANNING FOR %s", pa_target);
                
                bool rbr_detected = DetectRBR() || (Use_Micro_Base_PA && DetectMicroRBR());
                bool dbd_detected = DetectDBD() || (Use_Micro_Base_PA && DetectMicroDBD());
                
                if(pos_type == POSITION_TYPE_BUY && rbr_detected) {
                    if(pa_box_t2 != last_pa_box_time) {
                        reentry_pa_detected = true;
                        last_pa_box_time = pa_box_t2; 
                        DrawPABox(POSITION_TYPE_BUY);
                    }
                }
                if(pos_type == POSITION_TYPE_SELL && dbd_detected) {
                    if(pa_box_t2 != last_pa_box_time) {
                        reentry_pa_detected = true;
                        last_pa_box_time = pa_box_t2; 
                        DrawPABox(POSITION_TYPE_SELL);
                    }
                }
            }
        }
        else if(reentry_pa_detected)
        {
            if(!Use_PA_Confirmation)
            {
                string dir = (pos_type == POSITION_TYPE_BUY) ? "BULLISH" : "BEARISH";
                reentry_status_msg = StringFormat("PA BYPASSED: WAITING %s FIBO", dir);
            }
            else
            {
                string pa_target = (pos_type == POSITION_TYPE_BUY) ? "R.B.R" : "D.B.D";
                reentry_status_msg = StringFormat("ARMED %s: WAITING FIBO", pa_target);
            }
        }
    }
}

double NormalizeLot(double raw_lot)
{
    double min_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
    double max_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
    double step_lot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
    double final_lot = MathRound(raw_lot / step_lot) * step_lot;
    if(final_lot < min_lot) final_lot = min_lot;
    if(final_lot > max_lot) final_lot = max_lot;
    return final_lot;
}

double CalculateLotSize(bool is_reentry)
{
    double base_lot = 0.0;
    
    if(Use_Fixed_Lot) {
        base_lot = NormalizeLot(Fixed_Lot_Size);
    } else {
        double balance = AccountInfoDouble(ACCOUNT_BALANCE);
        double risk_amount = balance * (RiskPerTrade / 100.0);
        double raw_lot = risk_amount / 1000.0; 
        base_lot = NormalizeLot(raw_lot / runtime_MaxLayers);
    }
    
    if(is_reentry)
    {
        double largest_open_lot = base_lot;
        for(int i = 0; i < PositionsTotal(); i++)
        {
            if(posInfo.SelectByIndex(i) && IsManagedPosition())
            {
                if(posInfo.Volume() > largest_open_lot) largest_open_lot = posInfo.Volume();
            }
        }
        return NormalizeLot(largest_open_lot * Recovery_Multiplier);
    }
    
    return base_lot;
}

void ScanForSetup()
{
    if(Min_Win_Prob_Filter > 0 && runtime_WinProb < Min_Win_Prob_Filter) return;

    bool isNewsWindow = IsUpcomingNewsWindow();

    if(!isNewsWindow && UseTimeFilter) {
        datetime curr = TimeCurrent(); MqlDateTime dt; TimeToStruct(curr, dt);
        int m = dt.hour * 60 + dt.min;
        int s = StartHour * 60 + StartMinute; int e = EndHour * 60 + EndMinute;
        bool in_time = (s < e) ? (m >= s && m <= e) : (m >= s || m <= e);
        if(!in_time) return;
    }

    int start_idx = 1;
    int end_idx = Signal_Scan_Bars;

    if(reentry_pa_detected && pa_box_t2 > 0 && Use_PA_Confirmation) 
    {
        int pa_idx = iBarShift(_Symbol, _Period, pa_box_t2);
        if(pa_idx >= 0) {
            start_idx = (int)MathMax(1, pa_idx - Signal_Scan_Bars); 
            end_idx = pa_idx + Signal_Scan_Bars;
        }
    }
    
    int copy_amount = end_idx + 2; 

    double b_hi[], b_low[], m_up[], a_up[], m_dn[], a_dn[];
    double tp1_up[], tp2_up[], tp3_up[], tp1_dn[], tp2_dn[], tp3_dn[];
    
    ArraySetAsSeries(b_hi, true); ArraySetAsSeries(b_low, true);
    ArraySetAsSeries(m_up, true); ArraySetAsSeries(a_up, true);
    ArraySetAsSeries(m_dn, true); ArraySetAsSeries(a_dn, true);
    ArraySetAsSeries(tp1_up, true); ArraySetAsSeries(tp2_up, true); ArraySetAsSeries(tp3_up, true);
    ArraySetAsSeries(tp1_dn, true); ArraySetAsSeries(tp2_dn, true); ArraySetAsSeries(tp3_dn, true);

    if(CopyBuffer(fmcbr_handle, 4, 0, copy_amount, b_hi) <= end_idx || CopyBuffer(fmcbr_handle, 5, 0, copy_amount, b_low) <= end_idx) return;
    
    if(CopyBuffer(fmcbr_handle, 8, 0, copy_amount, m_up) <= end_idx || CopyBuffer(fmcbr_handle, 9, 0, copy_amount, a_up) <= end_idx) return;
    if(CopyBuffer(fmcbr_handle, 10, 0, copy_amount, m_dn) <= end_idx || CopyBuffer(fmcbr_handle, 11, 0, copy_amount, a_dn) <= end_idx) return;

    if(CopyBuffer(fmcbr_handle, 12, 0, copy_amount, tp1_up) <= end_idx || CopyBuffer(fmcbr_handle, 13, 0, copy_amount, tp2_up) <= end_idx || CopyBuffer(fmcbr_handle, 14, 0, copy_amount, tp3_up) <= end_idx) return;
    if(CopyBuffer(fmcbr_handle, 15, 0, copy_amount, tp1_dn) <= end_idx || CopyBuffer(fmcbr_handle, 16, 0, copy_amount, tp2_dn) <= end_idx || CopyBuffer(fmcbr_handle, 17, 0, copy_amount, tp3_dn) <= end_idx) return;

    int breakout_idx = -1;
    bool is_buy_breakout = false;
    bool is_sell_breakout = false;

    for(int i = start_idx; i <= end_idx; i++) {
        if(b_hi[i] > 0) { is_buy_breakout = true; breakout_idx = i; break; }
        if(b_low[i] > 0) { is_sell_breakout = true; breakout_idx = i; break; }
    }

    if(!is_buy_breakout && !is_sell_breakout) return;

    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    double current_tp_1272 = 0, current_tp1 = 0, current_tp2 = 0, current_tp3 = 0;
    double diff = 0;
    double anchor_a = 0;
    double anchor_b = 0;

    if(is_buy_breakout)
    {
        anchor_a = m_up[breakout_idx];  
        anchor_b = a_up[breakout_idx]; 
        
        if(anchor_a == 0.0 || anchor_b == 0.0) return; 
        
        diff = anchor_b - anchor_a;
        current_tp_1272 = anchor_a + (diff * 1.272);
        current_tp1 = tp1_up[breakout_idx];
        current_tp2 = tp2_up[breakout_idx];
        current_tp3 = tp3_up[breakout_idx];
        
        if(!isNewsWindow && iHigh(_Symbol, _Period, 0) >= current_tp1) return; 
    }
    else if(is_sell_breakout)
    {
        anchor_a = m_dn[breakout_idx]; 
        anchor_b = a_dn[breakout_idx]; 
        
        if(anchor_a == 0.0 || anchor_b == 0.0) return; 
        
        diff = anchor_a - anchor_b; 
        current_tp_1272 = anchor_a - (diff * 1.272);
        current_tp1 = tp1_dn[breakout_idx];
        current_tp2 = tp2_dn[breakout_idx];
        current_tp3 = tp3_dn[breakout_idx];
        
        if(!isNewsWindow && iLow(_Symbol, _Period, 0) <= current_tp1) return; 
    }

    if(diff <= 0) return; 

    double fibo_size_pips = diff / (point * 10);
    if(fibo_size_pips > Max_Setup_Pips) return; 

    if(locked_fibo_tp1 != 0.0 && MathAbs(current_tp1 - locked_fibo_tp1) < 50 * point) {
        return; 
    }

    bool is_reentry_trade = false;
    int current_basket = -1;
    double lowest_buy = 999999.0;
    double highest_sell = 0.0;
    
    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            is_reentry_trade = true;
            current_basket = (int)posInfo.PositionType();
            
            double open_price = posInfo.PriceOpen();
            if(current_basket == POSITION_TYPE_BUY && open_price < lowest_buy) lowest_buy = open_price;
            if(current_basket == POSITION_TYPE_SELL && open_price > highest_sell) highest_sell = open_price;
        }
    }

    // 🔹 SMART PYRAMIDING ENGINE
    double fibo_786 = is_buy_breakout ? (anchor_a + diff * 0.786) : (anchor_a - diff * 0.786);
    
    bool is_recovery_trade = false;
    bool is_pyramid_trade = false;
    
    if(is_reentry_trade) {
         if(current_basket == POSITION_TYPE_BUY) {
             if(fibo_786 < lowest_buy) is_recovery_trade = true;
             else is_pyramid_trade = true;
         }
         else if(current_basket == POSITION_TYPE_SELL) {
             if(fibo_786 > highest_sell) is_recovery_trade = true;
             else is_pyramid_trade = true;
         }
    }

    // --- DYNAMIC PIP STEP SWITCHER ---
    double active_pip_step = is_pyramid_trade ? Pyramid_PipStep : runtime_PipStep;
    double step_points = active_pip_step * 10 * point; 

    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

    // 🔹 PULLBACK CONTEXT LOGIC
    bool is_pullback_phase = false;
    double macro_pre_tp_cap = 0.0;
    bool is_pullback_exhausted = false;

    if(Use_Macro_Filter) {
        string current_macro = GetMacroTrend(fmcbr_macro_handle);
        string grand_macro   = GetMacroTrend(fmcbr_grand_handle);
        
        if(current_macro != "NEUTRAL" && grand_macro != "NEUTRAL" && current_macro != grand_macro) {
            is_pullback_phase = true;
            macro_pre_tp_cap = GetMacroPreTP(fmcbr_macro_handle, current_macro);
            
            if(macro_pre_tp_cap > 0.0) {
                if(current_macro == "BULLISH" && bid >= macro_pre_tp_cap) is_pullback_exhausted = true;
                if(current_macro == "BEARISH" && ask <= macro_pre_tp_cap) is_pullback_exhausted = true;
            }
        }
    }

    if(!is_reentry_trade || is_pyramid_trade)
    {
        if(!isNewsWindow) {
            if(is_buy_breakout && runtime_MLDirection == "SELL") return;
            if(is_sell_breakout && runtime_MLDirection == "BUY") return;
            if(runtime_MLDirection == "CHOPPY") return;
            
            if(Use_Macro_Filter) 
            {
                string current_macro = GetMacroTrend(fmcbr_macro_handle);
                if(is_buy_breakout && current_macro != "BULLISH") return;
                if(is_sell_breakout && current_macro != "BEARISH") return;
            }
        }
        
        // 🔹 BLOCK PULLBACK IF EXHAUSTED
        if(is_pullback_phase && is_pullback_exhausted) {
            reentry_status_msg = "PULLBACK EXHAUSTED: WAITING D1 ALIGN";
            return;
        }

        if(is_pyramid_trade) 
        {
            if(current_basket == POSITION_TYPE_BUY && is_sell_breakout) return; 
            if(current_basket == POSITION_TYPE_SELL && is_buy_breakout) return; 
            
            bool valid_distance = true;
            for(int i = 0; i < PositionsTotal(); i++) {
                if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
                    if(MathAbs(posInfo.PriceOpen() - fibo_786) < step_points) {
                        valid_distance = false; 
                        break;
                    }
                }
            }
            if(!valid_distance) return; 
        }
    }
    else if(is_recovery_trade)
    {
        if(!reentry_opp_tp_hit || !reentry_pa_detected) return; 
        if(current_basket == POSITION_TYPE_BUY && is_sell_breakout) return; 
        if(current_basket == POSITION_TYPE_SELL && is_buy_breakout) return; 
        
        bool valid_distance = true;
        for(int i = 0; i < PositionsTotal(); i++) {
            if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
                if(MathAbs(posInfo.PriceOpen() - fibo_786) < step_points) {
                    valid_distance = false; 
                    break;
                }
            }
        }
        if(!valid_distance) return; 
    }

    double lot_size = CalculateLotSize(is_recovery_trade);
    double stoplevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * point;
    bool valid_orders_placed = false;

    // 🔹 NEWS BREAKOUT ENGINE (STOP ORDERS)
    if(isNewsWindow)
    {
        int layers = (runtime_MaxLayers < News_Min_Layers) ? News_Min_Layers : runtime_MaxLayers;
        
        for(int j = OrdersTotal() - 1; j >= 0; j--) { 
            ulong t = OrderGetTicket(j); 
            if(t > 0 && IsManagedOrder(t)) trade.OrderDelete(t); 
        }

        if(is_buy_breakout) {
            double sl_hanyut = anchor_a - (diff * 0.5); 
            double start_price = MathMax(ask + (stoplevel * 1.5), anchor_b);
            
            for(int i = 0; i < layers; i++) {
                double entry = NormalizeDouble(start_price + (i * step_points), _Digits);
                double hard_tp = current_tp2; 
                
                if(hard_tp <= entry + stoplevel) {
                    hard_tp = current_tp3; 
                    if(hard_tp <= entry + stoplevel) {
                        hard_tp = entry + (diff * 2.0); 
                    }
                }

                if(is_pullback_phase && macro_pre_tp_cap > 0.0) {
                    if(hard_tp > macro_pre_tp_cap) hard_tp = macro_pre_tp_cap;
                }
                
                if(trade.BuyStop(lot_size, entry, _Symbol, sl_hanyut, hard_tp, ORDER_TIME_GTC, 0, "News_Breakout")) {
                    valid_orders_placed = true;
                }
            }
        } 
        else if(is_sell_breakout) {
            double sl_hanyut = anchor_a + (diff * 0.5);
            double start_price = MathMin(bid - (stoplevel * 1.5), anchor_b);
            
            for(int i = 0; i < layers; i++) {
                double entry = NormalizeDouble(start_price - (i * step_points), _Digits);
                double hard_tp = current_tp2; 
                
                if(hard_tp >= entry - stoplevel) {
                    hard_tp = current_tp3; 
                    if(hard_tp >= entry - stoplevel) {
                        hard_tp = entry - (diff * 2.0); 
                    }
                }

                if(is_pullback_phase && macro_pre_tp_cap > 0.0) {
                    if(hard_tp < macro_pre_tp_cap) hard_tp = macro_pre_tp_cap;
                }
                
                if(trade.SellStop(lot_size, entry, _Symbol, sl_hanyut, hard_tp, ORDER_TIME_GTC, 0, "News_Breakout")) {
                    valid_orders_placed = true;
                }
            }
        }
    }
    // 🔹 STANDARD LIMIT ORDER ENGINE
    else
    {
        if(is_buy_breakout)
        {
            static datetime last_buy_attempt = 0;
            if(TimeCurrent() - last_buy_attempt < 10) return; 
            last_buy_attempt = TimeCurrent();

            double fibo_236 = anchor_a + (diff * 0.236);
            
            for(int j = OrdersTotal() - 1; j >= 0; j--) { 
                ulong t = OrderGetTicket(j); 
                if(t > 0 && IsManagedOrder(t)) {
                    trade.OrderDelete(t); 
                }
            }

            bool market_executed = false; 

            for(int i = 0; i < runtime_MaxLayers; i++)
            {
                double entry_price = NormalizeDouble(fibo_786 - (i * step_points), _Digits);
                
                if(entry_price < fibo_236) break; 

                if(entry_price < ask - stoplevel) { 
                    if(trade.BuyLimit(lot_size, entry_price, _Symbol, 0, 0, ORDER_TIME_GTC, 0, EA_Comment)) {
                        valid_orders_placed = true; 
                    } else {
                        break; 
                    }
                } 
                else if(!market_executed) { 
                    if(trade.Buy(lot_size, _Symbol, ask, 0, 0, EA_Comment)) { 
                        valid_orders_placed = true; 
                        market_executed = true; 
                    } else {
                        break; 
                    }
                }
            }
        }
        else if(is_sell_breakout)
        {
            static datetime last_sell_attempt = 0;
            if(TimeCurrent() - last_sell_attempt < 10) return; 
            last_sell_attempt = TimeCurrent();

            double fibo_236 = anchor_a - (diff * 0.236);
            
            for(int j = OrdersTotal() - 1; j >= 0; j--) { 
                ulong t = OrderGetTicket(j); 
                if(t > 0 && IsManagedOrder(t)) {
                    trade.OrderDelete(t); 
                }
            }

            bool market_executed = false;

            for(int i = 0; i < runtime_MaxLayers; i++)
            {
                double entry_price = NormalizeDouble(fibo_786 + (i * step_points), _Digits);
                
                if(entry_price > fibo_236) break; 

                if(entry_price > bid + stoplevel) { 
                    if(trade.SellLimit(lot_size, entry_price, _Symbol, 0, 0, ORDER_TIME_GTC, 0, EA_Comment)) {
                        valid_orders_placed = true; 
                    } else {
                        break; 
                    }
                } 
                else if(!market_executed) { 
                    if(trade.Sell(lot_size, _Symbol, bid, 0, 0, EA_Comment)) { 
                        valid_orders_placed = true; 
                        market_executed = true; 
                    } else {
                        break; 
                    }
                }
            }
        }
    }
    
    if(valid_orders_placed) 
    { 
        locked_fibo_1272 = current_tp_1272;
        locked_fibo_tp1 = current_tp1; 
        locked_fibo_tp2 = current_tp2; 
        locked_fibo_tp3 = current_tp3; 
        locked_trend = is_buy_breakout ? 1 : -1;
        
        reentry_opp_tp_hit = false; 
        reentry_pa_detected = false; 
        opp_tp_level_hit = 0;
        QueueMarketingScreenshot("setup");
    }
}

//+------------------------------------------------------------------+
//| Auto Break-Even Evaluation & Pure Fibo Engine                    |
//+------------------------------------------------------------------+
double GetBasketNetProfit()
{
    double net_profit = 0.0;
    for(int i = PositionsTotal() - 1; i >= 0; i--)
    {
        if(posInfo.SelectByIndex(i) && IsManagedPosition())
        {
            net_profit += posInfo.Profit() + posInfo.Swap() + posInfo.Commission();
        }
    }
    return net_profit;
}

double GetExpectedProfitAtPrice(double target_price)
{
    double expected_profit = 0.0;
    bool has_positions = false;
    
    for(int i = 0; i < PositionsTotal(); i++)
    {
        if(posInfo.SelectByIndex(i) && IsManagedPosition())
        {
            has_positions = true;
            ENUM_ORDER_TYPE order_type = (posInfo.PositionType() == POSITION_TYPE_BUY) ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
            double calc_profit = 0.0;
            
            if(OrderCalcProfit(order_type, _Symbol, posInfo.Volume(), posInfo.PriceOpen(), target_price, calc_profit))
            {
                expected_profit += calc_profit + posInfo.Swap() + posInfo.Commission();
            }
        }
    }
    return has_positions ? expected_profit : 0.0;
}

//+------------------------------------------------------------------+
//| V11.97: Pure MTF FMCBR Indicator Fibo Target Engine              |
//+------------------------------------------------------------------+
bool GetExtremeFiboTarget(int handle, int trend, double min_req_profit, double &best_tp, string &tp_label, datetime &best_time, ENUM_TIMEFRAMES tf)
{
    if(handle == INVALID_HANDLE) return false;

    double best_valid_tp = (trend == 1) ? 999999.0 : 0.0;
    string best_label = "";
    bool found = false;
    
    double spread = 0.0;
    if(trend == -1 && Compensate_Spread) {
        spread = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID);
    }
    
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    
    if(trend == 1) // BUY 
    {
        double mula_up[], tp1_up[], tp2_up[], tp3_up[];
        
        ArraySetAsSeries(mula_up, true); ArraySetAsSeries(tp1_up, true);
        ArraySetAsSeries(tp2_up, true); ArraySetAsSeries(tp3_up, true);
        
        int c1 = CopyBuffer(handle, 8, 0, 1000, mula_up);
        int c2 = CopyBuffer(handle, 12, 0, 1000, tp1_up);
        int c3 = CopyBuffer(handle, 13, 0, 1000, tp2_up);
        int c4 = CopyBuffer(handle, 14, 0, 1000, tp3_up);
        
        if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0)
        {
            int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
            for(int i = 0; i < limit; i++) {
                if(mula_up[i] > 0.0) {
                    
                    datetime mula_time = iTime(_Symbol, tf, i); 
                    for(int k = i; k < i + 150 && k < limit; k++) {
                        if(MathAbs(iLow(_Symbol, tf, k) - mula_up[i]) < point || MathAbs(iHigh(_Symbol, tf, k) - mula_up[i]) < point) {
                            mula_time = iTime(_Symbol, tf, k);
                            break;
                        }
                    }
                    
                    if(Use_1272_Target && tp1_up[i] > 0.0) {
                        double diff_100 = (tp1_up[i] - mula_up[i]) / 1.618;
                        double tp_1272 = mula_up[i] + (diff_100 * 1.272);
                        if(tp_1272 < best_valid_tp && GetExpectedProfitAtPrice(tp_1272) >= min_req_profit) { 
                            best_valid_tp = tp_1272; best_label = "TP 1.272"; found = true; best_time = mula_time;
                        }
                    }
                    
                    if(tp1_up[i] != 0.0 && tp1_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp1_up[i]) >= min_req_profit) { best_valid_tp = tp1_up[i]; best_label = "TP1 (1.618)"; found = true; best_time = mula_time; }
                    if(tp2_up[i] != 0.0 && tp2_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp2_up[i]) >= min_req_profit) { best_valid_tp = tp2_up[i]; best_label = "TP2 (2.618)"; found = true; best_time = mula_time; }
                    if(tp3_up[i] != 0.0 && tp3_up[i] < best_valid_tp && GetExpectedProfitAtPrice(tp3_up[i]) >= min_req_profit) { best_valid_tp = tp3_up[i]; best_label = "TP3 (4.236)"; found = true; best_time = mula_time; }
                    
                    if(found) break; 
                }
            }
        }
    }
    else if(trend == -1) // SELL
    {
        double mula_dn[], tp1_dn[], tp2_dn[], tp3_dn[];
        
        ArraySetAsSeries(mula_dn, true); ArraySetAsSeries(tp1_dn, true);
        ArraySetAsSeries(tp2_dn, true); ArraySetAsSeries(tp3_dn, true);
        
        int c1 = CopyBuffer(handle, 10, 0, 1000, mula_dn);
        int c2 = CopyBuffer(handle, 15, 0, 1000, tp1_dn);
        int c3 = CopyBuffer(handle, 16, 0, 1000, tp2_dn);
        int c4 = CopyBuffer(handle, 17, 0, 1000, tp3_dn);
        
        if(c1 > 0 && c2 > 0 && c3 > 0 && c4 > 0)
        {
            int limit = (int)MathMin(MathMin(c1, c2), MathMin(c3, c4));
            for(int i = 0; i < limit; i++) {
                if(mula_dn[i] > 0.0) {
                    
                    datetime mula_time = iTime(_Symbol, tf, i); 
                    for(int k = i; k < i + 150 && k < limit; k++) {
                        if(MathAbs(iHigh(_Symbol, tf, k) - mula_dn[i]) < point || MathAbs(iLow(_Symbol, tf, k) - mula_dn[i]) < point) {
                            mula_time = iTime(_Symbol, tf, k);
                            break;
                        }
                    }
                    
                    if(Use_1272_Target && tp1_dn[i] > 0.0) {
                        double diff_100 = (mula_dn[i] - tp1_dn[i]) / 1.618;
                        double tp_1272 = mula_dn[i] - (diff_100 * 1.272);
                        if(tp_1272 > best_valid_tp && GetExpectedProfitAtPrice(tp_1272 + spread) >= min_req_profit) { 
                            best_valid_tp = tp_1272; best_label = "TP 1.272"; found = true; best_time = mula_time; 
                        }
                    }
                    
                    if(tp1_dn[i] != 0.0 && tp1_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp1_dn[i] + spread) >= min_req_profit) { best_valid_tp = tp1_dn[i]; best_label = "TP1 (1.618)"; found = true; best_time = mula_time; }
                    if(tp2_dn[i] != 0.0 && tp2_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp2_dn[i] + spread) >= min_req_profit) { best_valid_tp = tp2_dn[i]; best_label = "TP2 (2.618)"; found = true; best_time = mula_time; }
                    if(tp3_dn[i] != 0.0 && tp3_dn[i] > best_valid_tp && GetExpectedProfitAtPrice(tp3_dn[i] + spread) >= min_req_profit) { best_valid_tp = tp3_dn[i]; best_label = "TP3 (4.236)"; found = true; best_time = mula_time; }
                    
                    if(found) break; 
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

void UpdateDynamicFiboTP()
{
    if(!Use_Fibo_TP || locked_trend == 0) {
        DrawSafeTPLine(0.0);
        DrawSafeTPOrigin(0);
        return;
    }
    
    double total_vol = 0.0;
    double total_val = 0.0;
    bool has_positions = false;
    
    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            total_vol += posInfo.Volume();
            total_val += posInfo.PriceOpen() * posInfo.Volume();
            has_positions = true;
        }
    }
    if(!has_positions || total_vol == 0.0) {
        DrawSafeTPLine(0.0);
        DrawSafeTPOrigin(0);
        return;
    }
    
    double min_req_profit = runtime_Min_TP_Profit_USD * target_multi;
    if(min_req_profit < 0) min_req_profit = 0.0;

    bool target_found = false;
    double best_tp = 0.0;
    string best_tp_label = "";
    string tf_str = "";
    datetime best_time = 0;

    if(GetExtremeFiboTarget(fmcbr_handle, locked_trend, min_req_profit, best_tp, best_tp_label, best_time, _Period)) {
        active_basket_tp = best_tp;
        
        tf_str = EnumToString(_Period);
        StringReplace(tf_str, "PERIOD_", "");
        active_basket_tp_label = tf_str + " " + best_tp_label;
        
        target_found = true;
    }

    if(!target_found) {
        for(int i = 0; i < 6; i++) {
            if(htf_list[i] > _Period && htf_handles[i] != INVALID_HANDLE) {
                if(GetExtremeFiboTarget(htf_handles[i], locked_trend, min_req_profit, best_tp, best_tp_label, best_time, htf_list[i])) {
                    active_basket_tp = best_tp;
                    
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
            double bep = total_val / total_vol;
            double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
            double safe_buffer = 15 * point; 
            active_basket_tp = (locked_trend == 1) ? (bep + safe_buffer) : (bep - safe_buffer);
            active_basket_tp_label = "BREAKEVEN";
            best_time = 0; 
        } else {
            active_basket_tp = 0.0;
            active_basket_tp_label = "SCANNING FOR VALID HTF TP";
            best_time = 0;
        }
    }
    
    // 🔹 PULLBACK CAP (DYNAMIC TP)
    if(Use_Macro_Filter) {
        string current_macro = GetMacroTrend(fmcbr_macro_handle);
        string grand_macro   = GetMacroTrend(fmcbr_grand_handle);
        if(current_macro != "NEUTRAL" && grand_macro != "NEUTRAL" && current_macro != grand_macro) {
            double macro_pre_tp = GetMacroPreTP(fmcbr_macro_handle, current_macro);
            if(macro_pre_tp > 0.0) {
                if(locked_trend == 1 && active_basket_tp > macro_pre_tp) {
                    active_basket_tp = macro_pre_tp;
                    active_basket_tp_label = "H4 PULLBACK CAP (TP1)";
                }
                else if(locked_trend == -1 && active_basket_tp < macro_pre_tp) {
                    active_basket_tp = macro_pre_tp;
                    active_basket_tp_label = "H4 PULLBACK CAP (TP1)";
                }
            }
        }
    }
    
    if(active_basket_tp > 0) {
        DrawSafeTPLine(active_basket_tp);
        DrawSafeTPOrigin(best_time);
    } else {
        DrawSafeTPLine(0.0);
        DrawSafeTPOrigin(0);
    }
}

void ManageTrailingStop()
{
    if(!Use_Trailing_Stop || Trail_Start_Pips <= 0) return;
    
    double total_vol = 0.0;
    double total_val = 0.0;
    bool has_positions = false;
    
    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            total_vol += posInfo.Volume();
            total_val += posInfo.PriceOpen() * posInfo.Volume();
            has_positions = true;
        }
    }
    
    if(!has_positions || total_vol == 0.0 || locked_trend == 0) {
        locked_basket_sl = 0.0;
        return;
    }
    
    double basket_bep = total_val / total_vol;
    double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    
    double trail_start_pts = Trail_Start_Pips * 10 * point;
    double trail_step_pts  = Trail_Step_Pips * 10 * point;
    
    if(locked_trend == 1) // BUY Basket
    {
        double current_profit_pts = bid - basket_bep;
        
        if(current_profit_pts >= trail_start_pts)
        {
            double new_sl = bid - trail_step_pts;
            if(new_sl > basket_bep + (10 * point)) 
            {
                if(new_sl > locked_basket_sl || locked_basket_sl == 0.0) {
                    locked_basket_sl = new_sl;
                }
            }
        }
        
        if(locked_basket_sl > 0.0 && bid <= locked_basket_sl)
        {
            Print("💎 GeminiBot: Virtual Basket Trail Hit! Securing Positive Break-Even.");
            CloseAllAndClear();
        }
    }
    else if(locked_trend == -1) // SELL Basket
    {
        double current_profit_pts = basket_bep - ask;
        
        if(current_profit_pts >= trail_start_pts)
        {
            double new_sl = ask + trail_step_pts;
            if(new_sl < basket_bep - (10 * point)) 
            {
                if(new_sl < locked_basket_sl || locked_basket_sl == 0.0) {
                    locked_basket_sl = new_sl;
                }
            }
        }
        
        if(locked_basket_sl > 0.0 && ask >= locked_basket_sl)
        {
            Print("💎 GeminiBot: Virtual Basket Trail Hit! Securing Positive Break-Even.");
            CloseAllAndClear();
        }
    }
}

void ManageInvisibleTP()
{
    bool has_positions = false;
    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) { has_positions = true; break; }
    }
    
    if(!Use_Fibo_TP || !has_positions || active_basket_tp == 0.0 || locked_trend == 0) return;
    
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID); 
    double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    double spread = ask - bid;
    bool hit = false;
    
    if(locked_trend == 1 && bid >= active_basket_tp) hit = true;
    
    if(locked_trend == -1) {
        double trigger_price = Compensate_Spread ? (active_basket_tp + spread) : active_basket_tp;
        if(ask <= trigger_price) hit = true;
    }
    
    if(hit) {
        double current_profit = GetBasketNetProfit();
        double min_profit_threshold = runtime_Min_TP_Profit_USD * target_multi;
        
        if(current_profit >= min_profit_threshold) {
            CloseAllAndClear();
        } else {
            active_basket_tp_label = "WAIT (LOW PROFIT)";
        }
    }
}

void ManageBasketProfit()
{
    double bal = AccountInfoDouble(ACCOUNT_BALANCE); 
    double eq = AccountInfoDouble(ACCOUNT_EQUITY);
    double dd_percent = (bal > eq) ? ((bal - eq) / bal) * 100.0 : 0.0;

    if(Use_Hard_Stop && Hard_Stop_DD > 0 && dd_percent >= Hard_Stop_DD) {
        Print("HARD STOP: Drawdown ", DoubleToString(dd_percent, 2), "%.");
        CloseAllAndClear(); return;
    }

    double total_volume = 0.0;
    double total_profit = 0.0;
    bool has_positions = false;
    bool is_news_basket = false;
    
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            total_volume += posInfo.Volume();
            total_profit += posInfo.Profit() + posInfo.Swap() + posInfo.Commission();
            has_positions = true;
            if(StringFind(posInfo.Comment(), "News_Breakout") >= 0) is_news_basket = true;
        }
    }

    if(!has_positions || total_volume <= 0 || Target_Per_Lot <= 0.0) return;

    double dynamic_target_usd = 0.0;
    if(is_news_basket) {
        dynamic_target_usd = (eq <= News_Eq_Threshold) ? (News_TP_Small_Eq * target_multi) : (News_TP_Large_Eq * target_multi);
    } else {
        double active_target_per_lot = (dd_percent >= 5.0) ? Recovery_Per_Lot : Target_Per_Lot;
        dynamic_target_usd = total_volume * active_target_per_lot * target_multi;
    }

    if(dynamic_target_usd > 0 && total_profit >= dynamic_target_usd) {
        CloseAllAndClear();
    }
}

void CheckPendingInvalidation()
{
    if(locked_fibo_tp1 == 0.0 || locked_trend == 0) return;
    double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID); double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
    bool del = false;
    if(locked_trend == 1 && bid >= locked_fibo_tp1) del = true;
    if(locked_trend == -1 && ask <= locked_fibo_tp1) del = true;
    
    if(del) {
        for(int i = OrdersTotal() - 1; i >= 0; i--) {
            ulong t = OrderGetTicket(i); 
            if(t > 0 && IsManagedOrder(t)) {
                trade.OrderDelete(t);
            }
        }
    }
}

void CloseAllAndClear()
{
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) 
            trade.PositionClose(posInfo.Ticket());
    }
    for(int j = OrdersTotal() - 1; j >= 0; j--) {
        ulong ticket = OrderGetTicket(j); 
        if(ticket > 0 && IsManagedOrder(ticket)) {
            trade.OrderDelete(ticket);
        }
    }
    locked_basket_sl = 0.0; 
    DrawSafeTPLine(0.0); 
    DrawSafeTPOrigin(0);
}

void CleanOldFibos()
{
    int total = ObjectsTotal(0, 0, OBJ_FIBO); 
    if(total <= Max_Fibos_Shown) return; 

    datetime times[];
    string names[];
    ArrayResize(times, total);
    ArrayResize(names, total);

    for(int i = 0; i < total; i++) {
        names[i] = ObjectName(0, i, 0, OBJ_FIBO);
        times[i] = (datetime)ObjectGetInteger(0, names[i], OBJPROP_TIME, 0);
    }

    for(int i = 0; i < total - 1; i++) {
        for(int j = i + 1; j < total; j++) {
            if(times[i] < times[j]) { 
                datetime tempTime = times[i]; times[i] = times[j]; times[j] = tempTime;
                string tempName = names[i]; names[i] = names[j]; names[j] = tempName;
            }
        }
    }

    for(int i = Max_Fibos_Shown; i < total; i++) {
        ObjectDelete(0, names[i]);
    }
}

void CleanOldPABoxes()
{
    int total = ObjectsTotal(0, 0, OBJ_RECTANGLE); 
    int box_count = 0;
    
    for(int i = 0; i < total; i++) {
        if(StringFind(ObjectName(0, i, 0, OBJ_RECTANGLE), "PA_BOX_") == 0) box_count++;
    }
    
    if(box_count <= Max_Fibos_Shown) return; 

    datetime times[];
    string names[];
    ArrayResize(times, box_count);
    ArrayResize(names, box_count);

    int idx = 0;
    for(int i = 0; i < total; i++) {
        string obj_name = ObjectName(0, i, 0, OBJ_RECTANGLE);
        if(StringFind(obj_name, "PA_BOX_") == 0) {
            names[idx] = obj_name;
            times[idx] = (datetime)ObjectGetInteger(0, obj_name, OBJPROP_TIME, 0);
            idx++;
        }
    }

    for(int i = 0; i < box_count - 1; i++) {
        for(int j = i + 1; j < box_count; j++) {
            if(times[i] < times[j]) { 
                datetime tempTime = times[i]; times[i] = times[j]; times[j] = tempTime;
                string tempName = names[i]; names[i] = names[j]; names[j] = tempName;
            }
        }
    }

    for(int i = Max_Fibos_Shown; i < box_count; i++) {
        ObjectDelete(0, names[i]);
    }
}

double GetDailyProfit()
{
    datetime end_time = TimeCurrent();
    MqlDateTime dt;
    TimeToStruct(end_time, dt);
    
    dt.hour = 0; 
    dt.min = 0; 
    dt.sec = 0;
    datetime start_time = StructToTime(dt);
    
    HistorySelect(start_time, end_time);
    
    double daily_profit = 0.0;
    int total_deals = HistoryDealsTotal();
    
    for(int i = 0; i < total_deals; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket > 0)
        {
            if(IsManagedDeal(ticket))
            {
                daily_profit += HistoryDealGetDouble(ticket, DEAL_PROFIT) + 
                                HistoryDealGetDouble(ticket, DEAL_SWAP) + 
                                HistoryDealGetDouble(ticket, DEAL_COMMISSION);
            }
        }
    }
    
    return daily_profit;
}

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
    if(id == CHARTEVENT_OBJECT_CLICK && sparam == "GBUI_BtnClose") {
        CloseAllAndClear(); ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_STATE, false);
    }
}

void DeleteDashboard()
{
    for(int i = ObjectsTotal(0) - 1; i >= 0; i--) {
        string name = ObjectName(0, i); if(StringFind(name, "GBUI_") == 0) ObjectDelete(0, name);
    }
}

void CreatePanel(string name, int x, int y, int w, int h, color bg, color border)
{
    ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
    ObjectSetInteger(0, name, OBJPROP_XSIZE, w); ObjectSetInteger(0, name, OBJPROP_YSIZE, h);
    ObjectSetInteger(0, name, OBJPROP_BGCOLOR, bg); ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, border);
    ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
    
    ObjectSetInteger(0, name, OBJPROP_BACK, false);
    ObjectSetInteger(0, name, OBJPROP_ZORDER, 5); 
}

void CreateText(string name, int x, int y, string text, int size, color clr, bool bold = false)
{
    ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
    ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x); ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
    ObjectSetString(0, name, OBJPROP_TEXT, text); ObjectSetInteger(0, name, OBJPROP_COLOR, clr);
    ObjectSetInteger(0, name, OBJPROP_FONTSIZE, size); ObjectSetString(0, name, OBJPROP_FONT, bold ? "Segoe UI Bold" : "Segoe UI");
    
    ObjectSetInteger(0, name, OBJPROP_BACK, false); 
    ObjectSetInteger(0, name, OBJPROP_ZORDER, 6); 
}

void DrawDashboard()
{
    DeleteDashboard();
    
    CreatePanel("GBUI_MainBG", Dashboard_X, Dashboard_Y, 420, 480, C'21,21,21', clrDodgerBlue); 
    CreatePanel("GBUI_HeaderBG", Dashboard_X, Dashboard_Y, 420, 40, clrDodgerBlue, clrDodgerBlue);
    CreateText("GBUI_Title", Dashboard_X + 110, Dashboard_Y + 10, "💎 GEMINI BOT V11.97", 12, clrWhite, true);

    CreateText("GBUI_Time", Dashboard_X + 10, Dashboard_Y + 50, "Sunday 00:00:00 (GMT+8)", 11, clrGold, true);
    
    CreateText("GBUI_License", Dashboard_X + 10, Dashboard_Y + 70, "👑 VIP LICENSE: VERIFYING...", 9, clrDarkGray, true);

    CreateText("GBUI_H1", Dashboard_X + 10, Dashboard_Y + 100, "🏦 ACCOUNT ANALYTICS", 9, clrDarkGray, true);
    CreateText("GBUI_Bal", Dashboard_X + 10, Dashboard_Y + 120, "Balance: 0.00 " + acc_curr, 10, clrWhite);
    CreateText("GBUI_DD", Dashboard_X + 180, Dashboard_Y + 120, "DD: 0.00%", 10, clrOrange);
    
    CreateText("GBUI_DailyPL", Dashboard_X + 10, Dashboard_Y + 140, "Today P/L: 0.00 " + acc_curr, 10, clrWhite);
    CreateText("GBUI_ROI", Dashboard_X + 180, Dashboard_Y + 140, "Total ROI: 0.00 (0.00%)", 10, clrWhite); 

    CreateText("GBUI_H2", Dashboard_X + 10, Dashboard_Y + 180, "📊 ENGINE STATUS", 9, clrDarkGray, true);
    CreateText("GBUI_Regime", Dashboard_X + 180, Dashboard_Y + 180, "Regime: SCANNING", 9, clrDarkGray, true);
    
    CreateText("GBUI_Macro", Dashboard_X + 10, Dashboard_Y + 200, "Macro: SCANNING...", 10, clrWhite); 
    CreateText("GBUI_Trades", Dashboard_X + 10, Dashboard_Y + 220, "Active: 0", 10, clrWhite);
    CreateText("GBUI_Vol", Dashboard_X + 10, Dashboard_Y + 240, "Volume: 0.00", 10, clrWhite);
    CreateText("GBUI_FloatPips", Dashboard_X + 10, Dashboard_Y + 260, "Net Pips: 0.0", 10, clrWhite);

    CreateText("GBUI_FiboTP", Dashboard_X + 180, Dashboard_Y + 200, "Safe TP: WAITING", 10, clrPlum, true);
    CreateText("GBUI_Profit", Dashboard_X + 180, Dashboard_Y + 220, "P/L: 0.00 " + acc_curr, 11, clrWhite, true);
    CreateText("GBUI_Target", Dashboard_X + 180, Dashboard_Y + 240, "USD TP: 0.00 " + acc_curr, 10, clrDeepSkyBlue, true);
    CreateText("GBUI_EstTP", Dashboard_X + 180, Dashboard_Y + 260, "Est TP $: 0.00 " + acc_curr, 10, clrMediumAquamarine, true);

    CreateText("GBUI_H4", Dashboard_X + 10, Dashboard_Y + 290, "🧠 MACHINE LEARNING CLASSIFIER", 9, clrDarkGray, true);
    CreateText("GBUI_MLStatus", Dashboard_X + 10, Dashboard_Y + 310, "ML Signal: INITIALIZING", 10, clrGold, true);

    CreateText("GBUI_H3", Dashboard_X + 10, Dashboard_Y + 340, "🎯 PRICE ACTION SEQUENCE TRACKER", 9, clrDarkGray, true);
    CreateText("GBUI_Seq", Dashboard_X + 10, Dashboard_Y + 360, "State: STANDBY", 10, clrGold, true);
    
    CreateText("GBUI_Info", Dashboard_X + 10, Dashboard_Y + 390, "Auto-Adapting TP / Break-Even Protection Active", 8, clrDarkGray);

    ObjectCreate(0, "GBUI_BtnClose", OBJ_BUTTON, 0, 0, 0);
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_XDISTANCE, Dashboard_X + 10);
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_YDISTANCE, Dashboard_Y + 415);
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_XSIZE, 400); 
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_YSIZE, 30);
    ObjectSetString(0, "GBUI_BtnClose", OBJPROP_TEXT, "🛑 EMERGENCY CLOSE ALL");
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_BGCOLOR, clrCrimson);
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_COLOR, clrWhite);
    ObjectSetString(0, "GBUI_BtnClose", OBJPROP_FONT, "Segoe UI Bold");
    
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_BACK, false);
    ObjectSetInteger(0, "GBUI_BtnClose", OBJPROP_ZORDER, 10); 
}

void UpdateDashboard()
{
    datetime gmt8_time = TimeGMT() + 8 * 3600; 
    MqlDateTime dt; TimeToStruct(gmt8_time, dt);
    string days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    int dow = dt.day_of_week; if(dow < 0 || dow > 6) dow = 0;
    string time_str = StringFormat("%s %02d:%02d:%02d (GMT+8)", days[dow], dt.hour, dt.min, dt.sec);
    ObjectSetString(0, "GBUI_Time", OBJPROP_TEXT, time_str);

    // --- VIP LICENSE BADGE UPDATER ---
    if(runtime_LicenseStatus == "AUTHORIZED") {
        ObjectSetString(0, "GBUI_License", OBJPROP_TEXT, "👑 VIP LICENSE ACTIVE | " + runtime_ClientName + " (Exp: " + runtime_Expiry + ")");
        ObjectSetInteger(0, "GBUI_License", OBJPROP_COLOR, clrGold);
    } 
    else if(runtime_LicenseStatus == "LOCKED") {
        ObjectSetString(0, "GBUI_License", OBJPROP_TEXT, "🚫 LICENSE EXPIRED OR UNAUTHORIZED");
        ObjectSetInteger(0, "GBUI_License", OBJPROP_COLOR, clrCrimson);
    } 
    else {
        ObjectSetString(0, "GBUI_License", OBJPROP_TEXT, "⏳ CONNECTING TO MASTER SERVER...");
        ObjectSetInteger(0, "GBUI_License", OBJPROP_COLOR, clrDarkGray);
    }

    double bal = AccountInfoDouble(ACCOUNT_BALANCE); 
    double eq  = AccountInfoDouble(ACCOUNT_EQUITY);
    double dd  = (bal > eq) ? ((bal - eq) / bal) * 100 : 0.0;
    ObjectSetString(0, "GBUI_Bal", OBJPROP_TEXT, "Balance: " + DoubleToString(bal, 2) + " " + acc_curr);
    ObjectSetString(0, "GBUI_DD", OBJPROP_TEXT, "DD: " + DoubleToString(dd, 2) + "%");
    
    double daily_pl = GetDailyProfit();
    ObjectSetString(0, "GBUI_DailyPL", OBJPROP_TEXT, "Today P/L: " + DoubleToString(daily_pl, 2) + " " + acc_curr);
    if(daily_pl > 0) ObjectSetInteger(0, "GBUI_DailyPL", OBJPROP_COLOR, clrLime);
    else if(daily_pl < 0) ObjectSetInteger(0, "GBUI_DailyPL", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_DailyPL", OBJPROP_COLOR, clrWhite);

    // --- ROI CALCULATION ENGINE (SAFE SYMBOL FILTERED) ---
    datetime hist_start = UseCustomHistoryDates ? CustomStartDate : 0;
    datetime hist_end   = UseCustomHistoryDates ? CustomEndDate : TimeCurrent();
    HistorySelect(hist_start, hist_end); 
    
    int histTotal = HistoryDealsTotal(); 
    double total_profit = 0.0;
    
    for(int i = histTotal - 1; i >= 0; i--) { 
        ulong ticket = HistoryDealGetTicket(i); 
        if(ticket > 0 && IsManagedDeal(ticket)) {
            long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE); 
            if(deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL) { 
                long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
                if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_INOUT || entry == DEAL_ENTRY_OUT_BY) { 
                    total_profit += HistoryDealGetDouble(ticket, DEAL_PROFIT) + 
                                    HistoryDealGetDouble(ticket, DEAL_SWAP) + 
                                    HistoryDealGetDouble(ticket, DEAL_COMMISSION) + 
                                    HistoryDealGetDouble(ticket, DEAL_FEE);
                } 
            }
        } 
    }
    
    double growth_pct = (bal > 0) ? (total_profit / bal) * 100.0 : 0.0;
    string growth_str = StringFormat("Total ROI: %s%.2f (%.2f%%)", (total_profit > 0 ? "+" : ""), total_profit, growth_pct);
    
    ObjectSetString(0, "GBUI_ROI", OBJPROP_TEXT, growth_str);
    if(total_profit > 0) ObjectSetInteger(0, "GBUI_ROI", OBJPROP_COLOR, clrLime);
    else if(total_profit < 0) ObjectSetInteger(0, "GBUI_ROI", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_ROI", OBJPROP_COLOR, clrWhite);
    
    // --- DASHBOARD MACRO STATUS UPDATE ---
    string macro_state = GetMacroTrend(fmcbr_macro_handle);
    string grand_state = GetMacroTrend(fmcbr_grand_handle);
    
    string macro_disp = macro_state;
    if(Use_Macro_Filter && macro_state != "NEUTRAL" && grand_state != "NEUTRAL" && macro_state != grand_state) {
        macro_disp = macro_state + " (PULLBACK)";
    }
    
    ObjectSetString(0, "GBUI_Macro", OBJPROP_TEXT, "Macro: " + macro_disp);
    if(macro_state == "BULLISH") ObjectSetInteger(0, "GBUI_Macro", OBJPROP_COLOR, clrLime);
    else if(macro_state == "BEARISH") ObjectSetInteger(0, "GBUI_Macro", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_Macro", OBJPROP_COLOR, clrDarkGray);

    int total_trades = 0;
    double t_profit = 0.0;
    double t_volume = 0.0;
    double t_value = 0.0;
    int d_trend = 0;

    for(int i = 0; i < PositionsTotal(); i++) {
        if(posInfo.SelectByIndex(i) && IsManagedPosition()) {
            total_trades++;
            t_profit += posInfo.Profit() + posInfo.Swap() + posInfo.Commission();
            t_volume += posInfo.Volume();
            t_value += posInfo.PriceOpen() * posInfo.Volume();
            d_trend = (posInfo.PositionType() == POSITION_TYPE_BUY) ? 1 : -1;
        }
    }

    ObjectSetString(0, "GBUI_Regime", OBJPROP_TEXT, "Regime: " + runtime_Regime);
    if(runtime_Regime == "QUIET") ObjectSetInteger(0, "GBUI_Regime", OBJPROP_COLOR, clrMediumSpringGreen);
    else if(runtime_Regime == "NORMAL") ObjectSetInteger(0, "GBUI_Regime", OBJPROP_COLOR, clrDeepSkyBlue);
    else if(runtime_Regime == "EXTREME VOLATILITY") ObjectSetInteger(0, "GBUI_Regime", OBJPROP_COLOR, clrOrangeRed);
    else ObjectSetInteger(0, "GBUI_Regime", OBJPROP_COLOR, clrDarkGray);

    ObjectSetString(0, "GBUI_MLStatus", OBJPROP_TEXT, "ML Signal: " + runtime_MLStatus);
    if(runtime_MLDirection == "CHOPPY") ObjectSetInteger(0, "GBUI_MLStatus", OBJPROP_COLOR, clrDarkGray);
    else if(runtime_WinProb >= 65.0) ObjectSetInteger(0, "GBUI_MLStatus", OBJPROP_COLOR, clrLime);
    else if(runtime_WinProb <= 55.0) ObjectSetInteger(0, "GBUI_MLStatus", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_MLStatus", OBJPROP_COLOR, clrGold);
    
    ObjectSetString(0, "GBUI_Trades", OBJPROP_TEXT, "Active: " + IntegerToString(total_trades));
    ObjectSetString(0, "GBUI_Vol", OBJPROP_TEXT, "Volume: " + DoubleToString(t_volume, 2));

    ObjectSetString(0, "GBUI_Profit", OBJPROP_TEXT, "P/L: " + DoubleToString(t_profit, 2) + " " + acc_curr);
    if(t_profit > 0) ObjectSetInteger(0, "GBUI_Profit", OBJPROP_COLOR, clrLime);
    else if(t_profit < 0) ObjectSetInteger(0, "GBUI_Profit", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_Profit", OBJPROP_COLOR, clrWhite);

    double net_pips = 0.0;
    if(t_volume > 0.0 && d_trend != 0) {
        double bep = t_value / t_volume;
        double pt = SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10.0;
        if(pt == 0.0) pt = 1.0; 
        if(d_trend == 1) {
            net_pips = (SymbolInfoDouble(_Symbol, SYMBOL_BID) - bep) / pt;
        } else {
            net_pips = (bep - SymbolInfoDouble(_Symbol, SYMBOL_ASK)) / pt;
        }
    }
    
    ObjectSetString(0, "GBUI_FloatPips", OBJPROP_TEXT, "Net Pips: " + DoubleToString(net_pips, 1));
    if(net_pips > 0) ObjectSetInteger(0, "GBUI_FloatPips", OBJPROP_COLOR, clrLime);
    else if(net_pips < 0) ObjectSetInteger(0, "GBUI_FloatPips", OBJPROP_COLOR, clrCrimson);
    else ObjectSetInteger(0, "GBUI_FloatPips", OBJPROP_COLOR, clrWhite);

    if(Use_Fibo_TP && active_basket_tp > 0) {
        ObjectSetString(0, "GBUI_FiboTP", OBJPROP_TEXT, "Safe TP: " + DoubleToString(active_basket_tp, _Digits) + " (" + active_basket_tp_label + ")");
        
        double target_close_price = active_basket_tp;
        if(locked_trend == -1 && Compensate_Spread) {
            double spread = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID);
            target_close_price = active_basket_tp + spread;
        }
        
        double est_profit = GetExpectedProfitAtPrice(target_close_price);
        ObjectSetString(0, "GBUI_EstTP", OBJPROP_TEXT, "Est TP $: " + DoubleToString(est_profit, 2) + " " + acc_curr);
        
        if(est_profit > 0) ObjectSetInteger(0, "GBUI_EstTP", OBJPROP_COLOR, clrLime);
        else if(est_profit < 0) ObjectSetInteger(0, "GBUI_EstTP", OBJPROP_COLOR, clrCrimson);
        else ObjectSetInteger(0, "GBUI_EstTP", OBJPROP_COLOR, clrMediumAquamarine);

    } else if(!Use_Fibo_TP) {
        ObjectSetString(0, "GBUI_FiboTP", OBJPROP_TEXT, "Safe TP: DISABLED");
        ObjectSetString(0, "GBUI_EstTP", OBJPROP_TEXT, "Est TP $: 0.00 " + acc_curr);
        ObjectSetInteger(0, "GBUI_EstTP", OBJPROP_COLOR, clrDarkGray);
    } else {
        ObjectSetString(0, "GBUI_FiboTP", OBJPROP_TEXT, "Safe TP: WAITING");
        ObjectSetString(0, "GBUI_EstTP", OBJPROP_TEXT, "Est TP $: 0.00 " + acc_curr);
        ObjectSetInteger(0, "GBUI_EstTP", OBJPROP_COLOR, clrDarkGray);
    }

    double live_target = runtime_Min_TP_Profit_USD * target_multi;
    ObjectSetString(0, "GBUI_Target", OBJPROP_TEXT, "USD TP: " + DoubleToString(live_target, 2) + " " + acc_curr);

    // --- DASHBOARD SEQUENCE TEXT & COLORS ---
    ObjectSetString(0, "GBUI_Seq", OBJPROP_TEXT, "State: " + reentry_status_msg);
    
    if(StringFind(reentry_status_msg, "STANDBY") >= 0) {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrDarkGray); 
    }
    else if(StringFind(reentry_status_msg, "WAITING BUY") >= 0 || StringFind(reentry_status_msg, "BULLISH") >= 0 || StringFind(reentry_status_msg, "ARMED R.B.R") >= 0) {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrLime); 
    }
    else if(StringFind(reentry_status_msg, "WAITING SELL") >= 0 || StringFind(reentry_status_msg, "BEARISH") >= 0 || StringFind(reentry_status_msg, "ARMED D.B.D") >= 0) {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrCrimson); 
    }
    else if(StringFind(reentry_status_msg, "NEWS ARMED") >= 0 || StringFind(reentry_status_msg, "FIBO LOCKED") >= 0 || StringFind(reentry_status_msg, "SCALING IN") >= 0) {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrDeepSkyBlue);
    }
    else if(StringFind(reentry_status_msg, "BASKET ACTIVE") >= 0) {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrGold);
    }
    else {
        ObjectSetInteger(0, "GBUI_Seq", OBJPROP_COLOR, clrOrange); 
    }
    
    // --- VIRTUAL TRAIL INFO ---
    if(locked_basket_sl > 0.0) { 
        ObjectSetString(0, "GBUI_Info", OBJPROP_TEXT, "🔒 VIRTUAL TRAIL SECURED: " + DoubleToString(locked_basket_sl, _Digits)); 
        ObjectSetInteger(0, "GBUI_Info", OBJPROP_COLOR, clrLime); 
    } else { 
        ObjectSetString(0, "GBUI_Info", OBJPROP_TEXT, "Auto-Adapting TP / Break-Even Protection Active"); 
        ObjectSetInteger(0, "GBUI_Info", OBJPROP_COLOR, clrDarkGray); 
    }
}

//+------------------------------------------------------------------+
//| Bulletproof JSON Parsers for MT5                                 |
//+------------------------------------------------------------------+
string ExtractJSONString(string json, string key)
{
   string search_key = "\"" + key + "\"";
   int pos = StringFind(json, search_key);
   if(pos < 0) return "";
   
   int colon_pos = StringFind(json, ":", pos);
   if(colon_pos < 0) return "";
   
   int quote_start = StringFind(json, "\"", colon_pos);
   if(quote_start < 0) return "";
   
   int quote_end = StringFind(json, "\"", quote_start + 1);
   if(quote_end < 0) return "";
   
   return StringSubstr(json, quote_start + 1, quote_end - quote_start - 1);
}

double ExtractJSONDouble(string json, string key)
{
   string search_key = "\"" + key + "\"";
   int pos = StringFind(json, search_key);
   if(pos < 0) return 0.0;
   
   int colon_pos = StringFind(json, ":", pos);
   if(colon_pos < 0) return 0.0;
   
   int start = colon_pos + 1;
   int end_comma = StringFind(json, ",", start);
   int end_brace = StringFind(json, "}", start);
   
   int end = -1;
   if(end_comma > 0 && end_brace > 0) end = MathMin(end_comma, end_brace);
   else if(end_comma > 0) end = end_comma;
   else if(end_brace > 0) end = end_brace;
   
   if(end < 0) return 0.0;
   
   string num_str = StringSubstr(json, start, end - start);
   StringReplace(num_str, " ", "");
   return StringToDouble(num_str);
}

//+------------------------------------------------------------------+
//| Checks if a visual indicator is already attached to the chart    |
//+------------------------------------------------------------------+
bool IsIndicatorOnChart(string short_name)
{
    int total = ChartIndicatorsTotal(0, 0); 
    for(int i = 0; i < total; i++)
    {
        if(ChartIndicatorName(0, 0, i) == short_name) return true;
    }
    return false;
}

//+------------------------------------------------------------------+
//| End of File                                                      |
//+------------------------------------------------------------------+