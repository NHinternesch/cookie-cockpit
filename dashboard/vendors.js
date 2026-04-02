// Cookie Cockpit — Vendor Identification

const vendorExact = {
  // Google & YouTube
  _ga: "Google Analytics", _gid: "Google Analytics",
  _fbp: "Meta", _fbc: "Meta", fr: "Meta",
  IDE: "DoubleClick", DSID: "DoubleClick", test_cookie: "DoubleClick",
  __gads: "Google Ad Manager", __gpi: "Google Ad Manager",
  NID: "Google", SID: "Google", HSID: "Google", SSID: "Google",
  APISID: "Google", SAPISID: "Google", "1P_JAR": "Google",
  YSC: "YouTube", VISITOR_INFO1_LIVE: "YouTube", GPS: "YouTube",
  // Social & Ads
  bcookie: "LinkedIn", lidc: "LinkedIn",
  UserMatchHistory: "LinkedIn", AnalyticsSyncHistory: "LinkedIn",
  _ttp: "TikTok",
  _twclid: "Twitter/X", muc_ads: "Twitter/X",
  _rdt_uuid: "Reddit",
  _scid: "Snapchat", sc_at: "Snapchat",
  MUID: "Microsoft Ads",
  obuid: "Outbrain",
  // Marketing Automation
  hubspotutk: "HubSpot", __hstc: "HubSpot", __hssc: "HubSpot", __hssrc: "HubSpot",
  // Consent Management
  OptanonConsent: "OneTrust", OptanonAlertBoxClosed: "OneTrust",
  CookieConsent: "Cookiebot",
  euconsent: "Didomi",
  "euconsent-v2": "Didomi",
  _iub_cs: "iubenda",
  cmplz_consent_status: "Complianz", cmplz_marketing: "Complianz",
  axeptio_authorized_vendors: "Axeptio", axeptio_cookies: "Axeptio",
  sp_consent: "Sourcepoint",
  _evidon_consent_ls: "Crownpeak",
  // Server / Language
  PHPSESSID: "PHP", JSESSIONID: "Java", "ASP.NET_SessionId": "ASP.NET",
  // Adobe Analytics
  s_cc: "Adobe Analytics", s_sq: "Adobe Analytics",
  s_vi: "Adobe Analytics", s_fid: "Adobe Analytics",
  s_ecid: "Adobe Analytics", s_ppv: "Adobe Analytics",
  // Adobe Target
  at_check: "Adobe Target", at_lojson: "Adobe Target",
  // Segment
  ajs_user_id: "Segment", ajs_anonymous_id: "Segment",
  // Pinterest
  _derived_epik: "Pinterest", _epik: "Pinterest",
  // Privacy Sandbox
  "receive-cookie-deprecation": "Privacy Sandbox",
  // Piano
  atuserid: "Piano Analytics",
  __pianoParams: "Piano Composer", __tbc: "Piano Composer",
  xbc: "Piano Composer", __utp: "Piano ID",
  // Paywall & Subscription
  _tp: "Tinypass",
  metered_paywall_views: "Leaky Paywall",
  lura_auth: "Lura",
  // CDPs
  _schn: "Permutive",
  rl_user_id: "RudderStack", rl_anonymous_id: "RudderStack",
  _mfuuid_: "mParticle",
  _td: "Treasure Data",
  _sio: "Lytics",
  // DMPs
  _cc_id: "Lotame", _cc_aud: "Lotame", _cc_dc: "Lotame",
  bk_uuid: "Oracle BlueKai",
  kxlotame: "Lotame",
  rlas3: "LiveRamp", rl_ec: "LiveRamp",
  _li_ss: "Leadinfo",
  // A/B Testing & Personalization
  _vwo_uuid: "VWO",
  ABTasty: "AB Tasty", ABTastySession: "AB Tasty",
  ely_vID: "Kameleoon",
  _dyjsession: "Dynamic Yield", _dy_c_exps: "Dynamic Yield",
  _dy_geo: "Dynamic Yield", _dy_ses_load_seq: "Dynamic Yield",
  mt_misc: "Monetate", mt_mop: "Monetate",
  // Customer Engagement
  _braze_api: "Braze",
  __kla_id: "Klaviyo",
  _mailchimp: "Mailchimp",
  // Ad Tech
  ttd_id: "The Trade Desk",
  __qca: "Quantcast",
  _lr_env: "LiveRamp",
  _li_dcdm_c: "Linkedin Insights",
  // Affiliate & Attribution
  _ppcookie: "Post Affiliate Pro",
  // Tag Management
  _gtm_id: "Google Tag Manager",
  // Chat & Support
  __lc_cid: "LiveChat", __lc_cst: "LiveChat",
  _fw_crm_v: "Freshworks",
  // Session Replay & Analytics
  ab_test: "Google Optimize",
  // E-commerce
  _woocommerce_session: "WooCommerce",
  _shopify_y: "Shopify", _shopify_s: "Shopify",
  cart_id: "BigCommerce",
  // CDN & Performance
  __cfduid: "Cloudflare",
  _fastly: "Fastly",
  incap_ses: "Imperva", visid_incap: "Imperva",
  ak_bmsc: "Akamai", bm_sv: "Akamai", bm_sz: "Akamai",
  // Bot Detection
  _px3: "PerimeterX", _pxhd: "PerimeterX", _pxvid: "PerimeterX",
  __cf_bm: "Cloudflare Bot Management",
  datadome: "DataDome",
  reese84: "Shape Security",
  // A/B Testing & Feature Flags (expanded)
  _conv_v: "Convert", _conv_s: "Convert", _conv_r: "Convert",
  _ubpv: "Unbounce", ubvs: "Unbounce", ubvt: "Unbounce",
  _gb_uid: "GrowthBook",
  statsig_user_id: "Statsig", statsig_stable_id: "Statsig",
  optimizelyDomainTestCookie: "Optimizely", optimizelyOptOut: "Optimizely",
  _harness_cf: "Harness",
  // Session Replay & Heatmaps
  _ce_s: "Crazy Egg", _ce_clock_data: "Crazy Egg", is_returning: "Crazy Egg",
  __insp_wid: "Inspectlet", __insp_uid: "Inspectlet", __insp_nv: "Inspectlet",
  _lo_uid: "Lucky Orange", _lo_v: "Lucky Orange",
  // Analytics (expanded)
  _cb: "Chartbeat", _chartbeat2: "Chartbeat", _chartbeat4: "Chartbeat",
  _ym_uid: "Yandex Metrica", _ym_d: "Yandex Metrica", _ym_isad: "Yandex Metrica",
  BAIDUID: "Baidu Analytics", BIDUPSID: "Baidu Analytics",
  WT_FPC: "Webtrends",
  _mapp_: "Mapp Intelligence",
  _qualtrics: "Qualtrics", QSI_HistorySession: "Qualtrics",
  // Video
  _wistia_uid: "Wistia",
  vuid: "Vimeo",
  // Onboarding
  _apcues_usr: "Appcues",
  // Email / Marketing
  _sib_: "Brevo",
  _acq_: "ActiveCampaign",
  // Fraud Prevention
  ftr_blst: "Forter", ftr_ncd: "Forter",
  // Live Chat
  __tawkuuid: "Tawk.to", TawkConnectionTime: "Tawk.to",
  hblid: "Olark", olfsk: "Olark", wcsid: "Olark",
  ssupp_vid: "Smartsupp",
  // Surveys
  _svt_tid: "Survicate",
  _tf_: "Typeform",
  // Salesforce Commerce Cloud (Demandware)
  dwsid: "Salesforce Commerce Cloud", cqcid: "Salesforce Commerce Cloud",
  cquid: "Salesforce Commerce Cloud", __cq_dnt: "Salesforce Commerce Cloud",
  dw_dnt: "Salesforce Commerce Cloud",
  // Salesforce (general)
  BrowserId: "Salesforce", CookieConsentPolicy: "Salesforce",
  LSKey: "Salesforce",
  // SAP Commerce (Hybris)
  acceleratorSecureGUID: "SAP Commerce",
  // CMS
  "Drupal.visitor.cookie": "Drupal",
  SC_ANALYTICS_GLOBAL_COOKIE: "Sitecore", SC_ANALYTICS_SESSION_COOKIE: "Sitecore",
  // Monitoring / APM
  NREUM: "New Relic", NRAGENT: "New Relic",
  // CAPTCHA
  _GRECAPTCHA: "Google reCAPTCHA",
  // Consent Management (expanded)
  "cookieyes-consent": "CookieYes", cky_consent: "CookieYes",
  CookieControl: "CIVIC",
  tarteaucitron: "tarteaucitron",
  moove_gdpr_popup: "Moove GDPR",
  cookie_notice_accepted: "Cookie Notice",
  // Analytics (expanded)
  _paq: "Matomo",
  // Pendo
  _pendo_visitorId: "Pendo", _pendo_accountId: "Pendo", _pendo_meta: "Pendo",
  // Google Consent Mode
  _gac_gb: "Google Consent Mode",
  // Userpilot
  userpilot_id: "Userpilot",
  // Microsoft
  MC1: "Microsoft", MS0: "Microsoft",
  // Amazon
  "session-id": "Amazon", "i18n-prefs": "Amazon",
  // Evidon
  _evidon_consent_cookie: "Crownpeak",
  // Eppo
  eppo_session: "Eppo",
  // ContentKing
  _ck_visitor: "ContentKing",
  // Cxense / Piano Content
  cX_P: "Cxense", cX_S: "Cxense", cX_G: "Cxense",
  // Hightouch
  htjs_user_id: "Hightouch", htjs_anonymous_id: "Hightouch",
  // Heap
  _hp2_id: "Heap", _hp2_ses_props: "Heap", _hp2_props: "Heap",
  // OneTrust (expanded)
  OTGPPConsent: "OneTrust", OptanonActiveGroups: "OneTrust",
  // Cookiebot (expanded)
  CookieConsentBulkTicket: "Cookiebot", CookieConsentBulkSetting: "Cookiebot",
  // Usercentrics
  uc_settings: "Usercentrics", uc_user_interaction: "Usercentrics",
  // Sentry
  _sentry: "Sentry",
  // Bugsnag
  bugsnag_anon_id: "Bugsnag",
  // SpeedCurve
  _lux_uid: "SpeedCurve LUX",
  // Coveo
  coveo_visitorId: "Coveo",
  // Algolia
  _algolia: "Algolia",
  // Bloomreach
  _br_uid_2: "Bloomreach",
  // ContentStack
  _cs_id: "ContentStack",
  // Kustomer
  _kuid_: "Kustomer",
  // Gainsight PX
  _gs_v_GSN: "Gainsight",
  // Clearbit
  _cb_svref: "Clearbit",
  // Demandbase
  _db_uid: "Demandbase",
  // 6sense
  _6senseCompanyInfo: "6sense",
  // ZoomInfo
  _zi_: "ZoomInfo",
  // Rollbar
  _rollbar_: "Rollbar",
  // Chameleon
  _chmln: "Chameleon",
  // Customer.io
  _cio_id: "Customer.io",
  // Refiner
  _refiner_session: "Refiner",
  // Sprig
  _sprig_uid: "Sprig",
  // Google Publisher Tag
  __gpi_optout: "Google Ad Manager",
  // Bombora
  _bm_uid: "Bombora",
  // Heap (expanded)
  _hp2_hld: "Heap",
  // Impact.com
  IRContent: "Impact.com",
  // Commission Junction
  cje: "Commission Junction",
  // ShareASale
  sas_m: "ShareASale",
  // Rakuten
  _rmStore: "Rakuten",
  // Awin
  _aw_m_: "Awin",
  // ClickCease
  _ccfp: "ClickCease",
  // WebEngage
  _we_uid: "WebEngage",
  // CleverTap
  WZRK_G: "CleverTap",
  // MoEngage
  _moe_uid: "MoEngage",
  // Insider
  _ins_: "Insider",
  // Sailthru
  sailthru_hid: "Sailthru",
  // Listrak
  _ltksid: "Listrak",
  // Attentive
  __attentive_id: "Attentive",
  // Yotpo
  _yotpo_token: "Yotpo",
  // Bazaarvoice
  BVImplmain_site: "Bazaarvoice",
  // ContentKing (expanded)
  _ck_session: "ContentKing",
};

const vendorPrefixes = [
  // Google & Ads
  ["_ga_", "Google Analytics"], ["_gat", "Google Analytics"], ["__utm", "Google Analytics"],
  ["_gcl_", "Google Ads"], ["_gac_", "Google Ads"],
  // Social
  ["_tt_", "TikTok"],
  ["_pin_", "Pinterest"],
  ["li_", "LinkedIn"],
  ["_uet", "Microsoft Ads"], ["_uetvid", "Microsoft Ads"],
  // Marketing Automation
  ["__hs", "HubSpot"],
  // Session Replay & Analytics
  ["_hjid", "Hotjar"], ["_hj", "Hotjar"],
  ["_clck", "Clarity"], ["_clsk", "Clarity"],
  ["mp_", "Mixpanel"],
  ["amp_", "Amplitude"],
  ["_hp2_", "Heap"],
  ["_cs_", "ContentSquare"],
  ["_pk_", "Matomo"],
  ["_dd_", "Datadog"],
  ["_lr_", "LogRocket"],
  ["_fs_", "FullStory"],
  ["_sn_", "FullStory"],
  // Piano
  ["_at.", "Piano Analytics"], ["at_", "Piano Analytics"],
  ["pa_", "Piano Analytics"], ["_pcid", "Piano Analytics"],
  ["_pctx", "Piano Analytics"], ["_pprv", "Piano Analytics"],
  ["__piano", "Piano Composer"], ["tp_", "Piano Composer"],
  // Adobe
  ["AMCV_", "Adobe Analytics"], ["AMCVS_", "Adobe Analytics"],
  ["mbox", "Adobe Target"],
  // CDN & Infrastructure
  ["__cf", "Cloudflare"], ["cf_", "Cloudflare"],
  ["__stripe", "Stripe"],
  // Ad Tech
  ["__adroll", "AdRoll"],
  ["cto_", "Criteo"],
  ["t_gid", "Taboola"], ["taboola_", "Taboola"],
  ["_ljtrtb_", "Livejournal"],
  ["ttd_", "The Trade Desk"],
  // Chat & Engagement
  ["drift", "Drift"],
  ["intercom-", "Intercom"],
  // Marketing
  ["_mkto_", "Marketo"],
  ["sfdc-", "Salesforce"],
  ["pardot", "Pardot"],
  ["_zd", "Zendesk"],
  // Consent Management
  ["didomi", "Didomi"],
  ["cmapi_", "TrustArc"],
  ["uc_", "Usercentrics"],
  ["iub_", "iubenda"],
  ["cmplz_", "Complianz"],
  ["axeptio_", "Axeptio"],
  ["sp_", "Sourcepoint"],
  ["qc_", "Quantcast Choice"], ["_qc_", "Quantcast"],
  // CDPs
  ["ajs_", "Segment"],
  ["rl_", "RudderStack"],
  ["teal_", "Tealium"], ["utag_", "Tealium"],
  ["_mparticle_", "mParticle"], ["mprtcl-", "mParticle"],
  ["_td_", "Treasure Data"],
  ["seerid", "Lytics"], ["_sio_", "Lytics"],
  ["_bc_", "BlueConic"], ["bc_", "BlueConic"],
  // DMPs
  ["_cc_", "Lotame"],
  ["bk_", "Oracle BlueKai"],
  ["kx_", "Krux/Salesforce DMP"],
  ["permutive-", "Permutive"], ["_prmtv_", "Permutive"],
  ["rlas", "LiveRamp"],
  // A/B Testing & Personalization
  ["_vis_opt_", "VWO"], ["_vwo_", "VWO"],
  ["optimizelyenduser", "Optimizely"], ["optimizely", "Optimizely"],
  ["abtasty", "AB Tasty"],
  ["kameleoon", "Kameleoon"], ["ely_", "Kameleoon"],
  ["_dy_", "Dynamic Yield"],
  ["mt_", "Monetate"],
  ["_lp_", "LaunchDarkly"],
  ["split_", "Split.io"],
  // Customer Engagement
  ["_braze", "Braze"],
  ["__kla_", "Klaviyo"],
  ["_iterable_", "Iterable"],
  // Affiliate & Attribution
  ["_branch_", "Branch.io"], ["branch_", "Branch.io"],
  ["_appsflyer", "AppsFlyer"],
  ["_adjust_", "Adjust"],
  // CMS & E-commerce
  ["wp-", "WordPress"], ["wordpress_", "WordPress"],
  ["_shopify", "Shopify"],
  ["_woo", "WooCommerce"],
  ["_magento", "Magento"],
  // Paywall & Subscription
  ["piano_", "Piano"], ["__tp_", "Piano"],
  ["leaky_paywall_", "Leaky Paywall"],
  ["zuora_", "Zuora"],
  ["chargebee_", "Chargebee"],
  ["recurly_", "Recurly"],
  ["pelcro_", "Pelcro"],
  ["poool_", "Poool"],
  // Bot Detection
  ["_px", "PerimeterX"],
  ["incap_", "Imperva"], ["visid_incap", "Imperva"],
  ["ak_bmsc", "Akamai"], ["bm_", "Akamai"],
  ["datadome", "DataDome"],
  // Session Replay
  ["jarvis_", "Mouseflow"],
  ["_ueq_", "Userpilot"],
  ["pendo_", "Pendo"],
  ["_gainsight_", "Gainsight"],
  // A/B Testing & Feature Flags (expanded)
  ["_conv_", "Convert"],
  ["ubvs", "Unbounce"], ["ubvt", "Unbounce"], ["_ubpv", "Unbounce"],
  ["_gb_", "GrowthBook"],
  ["statsig_", "Statsig"],
  ["_harness_", "Harness"],
  // Session Replay & Heatmaps (expanded)
  ["_ce_", "Crazy Egg"],
  ["__insp_", "Inspectlet"],
  ["_lo_", "Lucky Orange"],
  ["smartlook_", "Smartlook"],
  // Analytics (expanded)
  ["_chartbeat", "Chartbeat"], ["_cb_", "Chartbeat"],
  ["_ym_", "Yandex Metrica"],
  ["_mapp_", "Mapp Intelligence"],
  ["_ph_", "PostHog"], ["ph_", "PostHog"],
  ["_sp_", "Snowplow"],
  // Video
  ["_wistia_", "Wistia"],
  // Onboarding
  ["_apcues_", "Appcues"], ["apcues_", "Appcues"],
  // Email / Marketing
  ["_sib_", "Brevo"], ["sib_", "Brevo"],
  ["_acq_", "ActiveCampaign"],
  // Fraud Prevention
  ["ftr_", "Forter"],
  // Live Chat
  ["__tawk", "Tawk.to"],
  ["ssupp_", "Smartsupp"],
  // Surveys
  ["_svt_", "Survicate"], ["svt_", "Survicate"],
  ["_tf_", "Typeform"],
  // Salesforce Commerce Cloud (Demandware)
  ["dwac_", "Salesforce Commerce Cloud"], ["dwanonymous_", "Salesforce Commerce Cloud"],
  ["dwsecuretoken_", "Salesforce Commerce Cloud"], ["dw_", "Salesforce Commerce Cloud"],
  // Salesforce (general)
  ["sfdc-", "Salesforce"], ["_sfmc_", "Salesforce Marketing Cloud"],
  // SAP Commerce
  ["sap-", "SAP Commerce"],
  // Sitecore
  ["SC_ANALYTICS_", "Sitecore"],
  // New Relic
  ["NRBA_", "New Relic"], ["newrelic", "New Relic"],
  // Consent Management (expanded)
  ["cookieyes", "CookieYes"], ["cky_", "CookieYes"],
  ["tarteaucitron", "tarteaucitron"],
  ["moove_gdpr_", "Moove GDPR"],
  // Pendo
  ["pendo_", "Pendo"], ["_pendo_", "Pendo"],
  // Userpilot
  ["userpilot_", "Userpilot"],
  // Shopware
  ["sw-", "Shopware"], ["session-", "Shopware"],
  // Drupal
  ["SESS", "Drupal"], ["SSESS", "Drupal"],
  // Cxense / Piano Content
  ["cX_", "Cxense"], ["cx_", "Cxense"],
  // Eppo
  ["eppo_", "Eppo"],
  // Google Consent Mode
  ["_gac_gb", "Google Consent Mode"],
  // Hightouch
  ["htjs_", "Hightouch"], ["_ht_", "Hightouch"],
  // Bloomreach
  ["_br_", "Bloomreach"], ["br_", "Bloomreach"],
  // Demandbase
  ["_db_", "Demandbase"],
  // 6sense
  ["_6sense", "6sense"],
  // ZoomInfo
  ["_zi_", "ZoomInfo"],
  // Chameleon
  ["_chmln", "Chameleon"], ["chmln_", "Chameleon"],
  // Customer.io
  ["_cio", "Customer.io"],
  // Sprig
  ["_sprig_", "Sprig"],
  // Refiner
  ["_refiner_", "Refiner"],
  // Clearbit
  ["_cb_sv", "Clearbit"],
  // Bombora
  ["_bm_uid", "Bombora"],
  // Impact.com
  ["irclickid", "Impact.com"],
  // ClickCease
  ["_ccfp", "ClickCease"],
  // WebEngage
  ["_we_", "WebEngage"],
  // CleverTap
  ["WZRK_", "CleverTap"],
  // MoEngage
  ["_moe_", "MoEngage"],
  // Insider
  ["_ins_", "Insider"], ["ins_", "Insider"],
  // Sailthru
  ["sailthru_", "Sailthru"],
  // Listrak
  ["_ltk", "Listrak"],
  // Attentive
  ["__attentive", "Attentive"],
  // Yotpo
  ["_yotpo_", "Yotpo"],
  // Coveo
  ["coveo_", "Coveo"],
  // SpeedCurve LUX
  ["_lux_", "SpeedCurve LUX"],
  // Sentry
  ["_sentry", "Sentry"],
  // Rollbar
  ["_rollbar", "Rollbar"],
  // Bugsnag
  ["bugsnag_", "Bugsnag"],
  // Gainsight PX
  ["_gs_", "Gainsight"],
  // Kustomer
  ["_kuid", "Kustomer"],
  // ContentStack
  ["_cs_id", "ContentStack"],
  // Algolia
  ["_algolia", "Algolia"],
  // Awin
  ["_aw_m_", "Awin"],
  // Bazaarvoice
  ["BVImpl", "Bazaarvoice"], ["BVBRANDID", "Bazaarvoice"],
];

const vendorDomains = {
  // Google
  "doubleclick.net": "DoubleClick",
  "google-analytics.com": "Google Analytics",
  "googleadservices.com": "Google Ads",
  "googlesyndication.com": "Google Ad Manager",
  "googletagmanager.com": "Google Tag Manager",
  "googleapis.com": "Google",
  "youtube.com": "YouTube",
  "ytimg.com": "YouTube",
  // Social & Ads
  "facebook.com": "Meta", "facebook.net": "Meta", "fbcdn.net": "Meta",
  "instagram.com": "Meta",
  "linkedin.com": "LinkedIn",
  "tiktok.com": "TikTok", "tiktokcdn.com": "TikTok",
  "twitter.com": "Twitter/X", "x.com": "Twitter/X", "twimg.com": "Twitter/X",
  "snapchat.com": "Snapchat", "sc-cdn.net": "Snapchat",
  "pinterest.com": "Pinterest",
  "reddit.com": "Reddit",
  "outbrain.com": "Outbrain",
  "taboola.com": "Taboola",
  // Ad Tech
  "criteo.com": "Criteo", "criteo.net": "Criteo",
  "adroll.com": "AdRoll",
  "adsrvr.org": "The Trade Desk",
  "quantserve.com": "Quantcast",
  "bluekai.com": "Oracle BlueKai",
  "demdex.net": "Adobe Audience Manager",
  "krux.net": "Krux/Salesforce DMP",
  "rubiconproject.com": "Rubicon Project",
  "pubmatic.com": "PubMatic",
  "openx.net": "OpenX",
  "casalemedia.com": "Index Exchange",
  "indexww.com": "Index Exchange",
  "bidswitch.net": "Bidswitch",
  "adnxs.com": "Xandr/AppNexus",
  "liveramp.com": "LiveRamp",
  // Consent Management
  "trustarc.com": "TrustArc",
  "onetrust.com": "OneTrust",
  "cookiebot.com": "Cookiebot",
  "didomi.io": "Didomi",
  "sourcepoint.com": "Sourcepoint",
  "usercentrics.eu": "Usercentrics",
  // Analytics & Session Replay
  "hotjar.com": "Hotjar",
  "clarity.ms": "Clarity",
  "mixpanel.com": "Mixpanel",
  "amplitude.com": "Amplitude",
  "heap.io": "Heap",
  "contentsquare.net": "ContentSquare",
  "fullstory.com": "FullStory",
  "logrocket.com": "LogRocket",
  "mouseflow.com": "Mouseflow",
  // Marketing Automation
  "hubspot.com": "HubSpot", "hsforms.com": "HubSpot",
  "marketo.net": "Marketo", "marketo.com": "Marketo",
  "pardot.com": "Pardot",
  "klaviyo.com": "Klaviyo",
  "braze.com": "Braze",
  // CDN & Performance
  "cloudflare.com": "Cloudflare",
  "akamai.net": "Akamai", "akamaized.net": "Akamai",
  "fastly.net": "Fastly",
  "imperva.com": "Imperva", "incapdns.net": "Imperva",
  // Piano
  "piano.io": "Piano", "tinypass.com": "Piano",
  "at-o.net": "Piano Analytics",
  // CDPs
  "segment.io": "Segment", "segment.com": "Segment",
  "rudderstack.com": "RudderStack",
  "tealium.com": "Tealium",
  "mparticle.com": "mParticle",
  "treasuredata.com": "Treasure Data",
  // Customer Data
  "lotame.com": "Lotame",
  "permutive.com": "Permutive",
  "blueconic.net": "BlueConic",
  // A/B Testing
  "optimizely.com": "Optimizely",
  "abtasty.com": "AB Tasty",
  "kameleoon.com": "Kameleoon",
  "dynamicyield.com": "Dynamic Yield",
  // Bot Detection
  "perimeterx.net": "PerimeterX",
  "datadome.co": "DataDome",
  "shapesecurity.com": "Shape Security",
  // Payments
  "stripe.com": "Stripe",
  // Chat
  "drift.com": "Drift",
  "intercom.io": "Intercom",
  "livechatinc.com": "LiveChat",
  "freshworks.com": "Freshworks",
  "zendesk.com": "Zendesk",
  // A/B Testing & Feature Flags (expanded)
  "convert.com": "Convert",
  "unbounce.com": "Unbounce",
  "growthbook.io": "GrowthBook",
  "statsig.com": "Statsig",
  "launchdarkly.com": "LaunchDarkly",
  "split.io": "Split.io",
  "harness.io": "Harness",
  // Session Replay & Heatmaps (expanded)
  "crazyegg.com": "Crazy Egg",
  "inspectlet.com": "Inspectlet",
  "luckyorange.com": "Lucky Orange",
  "smartlook.com": "Smartlook",
  // Analytics (expanded)
  "chartbeat.com": "Chartbeat", "chartbeat.net": "Chartbeat",
  "mc.yandex.ru": "Yandex Metrica", "yandex.ru": "Yandex Metrica",
  "hm.baidu.com": "Baidu Analytics",
  "webtrends.com": "Webtrends",
  "mapp.com": "Mapp Intelligence",
  "qualtrics.com": "Qualtrics",
  "posthog.com": "PostHog",
  "snowplow.io": "Snowplow", "snowplowanalytics.com": "Snowplow",
  // Video
  "wistia.com": "Wistia", "wistia.net": "Wistia",
  "vimeo.com": "Vimeo",
  // Onboarding
  "appcues.com": "Appcues",
  // Email / Marketing
  "brevo.com": "Brevo", "sendinblue.com": "Brevo",
  "activecampaign.com": "ActiveCampaign",
  // Fraud Prevention
  "forter.com": "Forter",
  // Live Chat (expanded)
  "tawk.to": "Tawk.to",
  "olark.com": "Olark",
  "smartsupp.com": "Smartsupp",
  // Surveys
  "survicate.com": "Survicate",
  "typeform.com": "Typeform",
  // Salesforce Commerce Cloud (Demandware)
  "demandware.net": "Salesforce Commerce Cloud",
  "demandware.com": "Salesforce Commerce Cloud",
  "commercecloud.salesforce.com": "Salesforce Commerce Cloud",
  // Salesforce (general)
  "salesforce.com": "Salesforce",
  "force.com": "Salesforce",
  "exacttarget.com": "Salesforce Marketing Cloud",
  // SAP Commerce
  "sap.com": "SAP Commerce",
  "hybris.com": "SAP Commerce",
  // Sitecore
  "sitecore.net": "Sitecore",
  // New Relic
  "newrelic.com": "New Relic",
  "nr-data.net": "New Relic",
  // Matomo
  "matomo.cloud": "Matomo",
  // Pendo
  "pendo.io": "Pendo",
  // Userpilot
  "userpilot.io": "Userpilot",
  // Shopware
  "shopware.com": "Shopware",
  // Amazon (ads/affiliate)
  "amazon-adsystem.com": "Amazon",
  // CookieYes
  "cookieyes.com": "CookieYes",
  // Cxense / Piano Content
  "cxense.com": "Cxense",
  // Plausible / Fathom / Simple Analytics (privacy-focused)
  "plausible.io": "Plausible Analytics",
  "usefathom.com": "Fathom Analytics",
  // Eppo
  "geteppo.com": "Eppo",
  // ContentKing
  "contentkingapp.com": "ContentKing",
  // Hightouch
  "hightouch.com": "Hightouch", "htevents.com": "Hightouch",
  // Bloomreach
  "bloomreach.com": "Bloomreach", "brxcdn.com": "Bloomreach",
  // Demandbase
  "demandbase.com": "Demandbase",
  // 6sense
  "6sense.com": "6sense", "6sc.co": "6sense",
  // ZoomInfo
  "zoominfo.com": "ZoomInfo", "ws.zoominfo.com": "ZoomInfo",
  // Clearbit
  "clearbit.com": "Clearbit",
  // Customer.io
  "customer.io": "Customer.io",
  // Chameleon
  "chameleon.io": "Chameleon",
  // Sprig
  "sprig.com": "Sprig",
  // Refiner
  "refiner.io": "Refiner",
  // Bombora
  "bombora.com": "Bombora",
  // Impact.com
  "impact.com": "Impact.com", "impactradius.com": "Impact.com",
  // Commission Junction
  "cj.com": "Commission Junction",
  // ShareASale
  "shareasale.com": "ShareASale",
  // Rakuten
  "rakuten.com": "Rakuten",
  // Awin
  "awin1.com": "Awin", "awin.com": "Awin",
  // ClickCease
  "clickcease.com": "ClickCease",
  // WebEngage
  "webengage.com": "WebEngage",
  // CleverTap
  "clevertap.com": "CleverTap", "wzrkt.com": "CleverTap",
  // MoEngage
  "moengage.com": "MoEngage",
  // Insider
  "useinsider.com": "Insider",
  // Sailthru
  "sailthru.com": "Sailthru",
  // Listrak
  "listrak.com": "Listrak",
  // Attentive
  "attentivemobile.com": "Attentive", "attn.tv": "Attentive",
  // Yotpo
  "yotpo.com": "Yotpo",
  // Bazaarvoice
  "bazaarvoice.com": "Bazaarvoice",
  // Coveo
  "coveo.com": "Coveo",
  // Algolia
  "algolia.com": "Algolia", "algolia.net": "Algolia",
  // SpeedCurve
  "speedcurve.com": "SpeedCurve LUX",
  // Sentry
  "sentry.io": "Sentry",
  // Rollbar
  "rollbar.com": "Rollbar",
  // Bugsnag
  "bugsnag.com": "Bugsnag",
  // Gainsight
  "gainsight.com": "Gainsight",
  // Kustomer
  "kustomer.com": "Kustomer",
  // ContentStack
  "contentstack.com": "ContentStack", "contentstack.io": "ContentStack",
  // Contentful
  "contentful.com": "Contentful",
  // Sanity
  "sanity.io": "Sanity",
  // Storyblok
  "storyblok.com": "Storyblok",
  // Builder.io
  "builder.io": "Builder.io",
  // Netlify
  "netlify.com": "Netlify", "netlify.app": "Netlify",
  // Vercel
  "vercel.com": "Vercel", "vercel.app": "Vercel",
  // Cloudinary
  "cloudinary.com": "Cloudinary",
  // Imgix
  "imgix.net": "Imgix",
  // Twilio
  "twilio.com": "Twilio",
  // SendGrid
  "sendgrid.net": "SendGrid", "sendgrid.com": "SendGrid",
  // Mailgun
  "mailgun.com": "Mailgun",
  // Mandrill
  "mandrillapp.com": "Mandrill",
  // Cookiefirst
  "cookiefirst.com": "CookieFirst",
  // Osano
  "osano.com": "Osano",
  // Transcend
  "transcend.io": "Transcend",
  // DataGrail
  "datagrail.io": "DataGrail",
  // Ketch
  "ketch.com": "Ketch",
  // Commanders Act
  "tagcommander.com": "Commanders Act",
  // Ensighten
  "ensighten.com": "Ensighten",
  // Signal (now TransUnion)
  "signal.co": "Signal",
  // MediaMath
  "mathtag.com": "MediaMath",
  // Lotame (expanded)
  "crwdcntrl.net": "Lotame",
  // Outbrain (expanded)
  "outbrainsdk.com": "Outbrain",
  // Taboola (expanded)
  "taboolasyndication.com": "Taboola",
  // Sprinklr
  "sprinklr.com": "Sprinklr",
  // Conductor
  "conductor.com": "Conductor",
  // Recurly
  "recurly.com": "Recurly",
  // Chargebee
  "chargebee.com": "Chargebee",
  // Zuora
  "zuora.com": "Zuora",
  // Pelcro
  "pelcro.com": "Pelcro",
};

function identifyVendor(cookieName, domain) {
  // 1. Exact match (case-sensitive, then lowercase fallback)
  const exact = vendorExact[cookieName] || vendorExact[cookieName.toLowerCase()];
  if (exact) return exact;
  // 2. Prefix match
  const lower = cookieName.toLowerCase();
  for (const [prefix, vendor] of vendorPrefixes) {
    if (lower.startsWith(prefix)) return vendor;
  }
  // 3. Domain match (if domain provided)
  if (domain) {
    const d = domain.toLowerCase().replace(/^\./, "");
    for (const [domainKey, vendor] of Object.entries(vendorDomains)) {
      if (d === domainKey || d.endsWith("." + domainKey)) return vendor;
    }
  }
  return null;
}
