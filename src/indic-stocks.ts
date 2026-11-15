import type { AssetType, Exchange, StockItem } from './types';

export interface KnownStockEntry {
  pattern: RegExp;
  symbol: string;
  nameEn: string;
  nameGu: string;
  nameHi: string;
  exchange?: Exchange;
  assetType?: AssetType;
  category?: string;
  tracks?: string;
}

export const KNOWN_INDIAN_INDICES: KnownStockEntry[] = [
  {
    pattern: /bse\s*sensex|\bsensex\b|સેન્સેક્સ|બીએસઈ\s*સેન્સેક્સ|सेंसेक्स|बीएसई\s*सेंसेक्स/i,
    symbol: '^BSESN',
    exchange: 'BSE',
    assetType: 'index',
    nameEn: 'BSE SENSEX',
    nameGu: 'બીએસઈ સેન્સેક્સ',
    nameHi: 'बीएसई सेंसेक्स',
    tracks: 'Benchmark index of top 30 companies on Bombay Stock Exchange (BSE)',
  },
  {
    pattern: /bank\s*nifty|nifty\s*bank|બેંક\s*નિફ્ટી|નિફ્ટી\s*બેંક|बैंक\s*निफ्टी|निफ्टी\s*बैंक/i,
    symbol: '^NSEBANK',
    exchange: 'NSE',
    assetType: 'index',
    nameEn: 'NIFTY BANK',
    nameGu: 'નિફ્ટી બેંક',
    nameHi: 'निफ्टी बैंक',
    tracks: 'Index of the most liquid and large Indian banking stocks on NSE',
  },
  {
    pattern: /nifty\s*it|નિફ્ટી\s*આઈટી|નિફ્ટી\s*આઇટી|निफ्टी\s*आईटी/i,
    symbol: '^CNXIT',
    exchange: 'NSE',
    assetType: 'index',
    nameEn: 'NIFTY IT',
    nameGu: 'નિફ્ટી આઈટી',
    nameHi: 'निफ्टी आईटी',
    tracks: 'Index of major Indian IT companies on NSE',
  },
  {
    pattern: /nifty\s*500|નિફ્ટી\s*500|નિફ્ટી\s*૫૦૦|निफ्टी\s*500/i,
    symbol: '^CRSLDX',
    exchange: 'NSE',
    assetType: 'index',
    nameEn: 'NIFTY 500',
    nameGu: 'નિફ્ટી ૫૦૦',
    nameHi: 'निफ्टी 500',
    tracks: 'Broad market index of top 500 companies listed on NSE',
  },
  {
    pattern: /nifty\s*50|nifty50|\bnifty\b|નિફ્ટી\s*50|નિફ્ટી\s*૫૦|નિફ્ટી\s*પચાસ|નિફ્ટી|निफ्टी\s*50|निफ्टी\s*पचास|निफ्टी/i,
    symbol: '^NSEI',
    exchange: 'NSE',
    assetType: 'index',
    nameEn: 'NIFTY 50',
    nameGu: 'નિફ્ટી ૫૦',
    nameHi: 'निफ्टी 50',
    tracks: 'Benchmark index of top 50 large-cap Indian companies on NSE',
  },
  {
    pattern: /national stock exchange|\bnse\s*(share|stock|company|ltd|limited)\b|એનએસઈ\s*(શેર|લિમિટેડ)|एनएसई\s*(शेयर|लिमिटेड)/i,
    symbol: 'NSE.BO',
    exchange: 'BSE',
    assetType: 'stock',
    nameEn: 'National Stock Exchange (NSE)',
    nameGu: 'એનએસઈ શેર',
    nameHi: 'एनएसई शेयर',
  },
  {
    pattern: /bse\s*(ltd|limited|share|stock|company)|બીએસઈ\s*(શેર|લિમિટેડ)|बीएसई\s*(शेयर|लिमिटेड)/i,
    symbol: 'BSE.NS',
    exchange: 'NSE',
    assetType: 'stock',
    nameEn: 'BSE Limited',
    nameGu: 'બીએસઈ લિમિટેડ',
    nameHi: 'बीएसई लिमिटेड',
  },
];

export const KNOWN_INDIAN_ETFS: KnownStockEntry[] = [
  {
    pattern: /sensex\s*bees|sensex\s*etf|સેન્સેક્સ\s*(બીઝ|ઈટીએફ|ઇટીએફ)|सेंसेक्स\s*(बीज़|बीज|ईटीएफ)/i,
    symbol: 'SENSEXBEES.BO',
    exchange: 'BSE',
    assetType: 'etf',
    category: 'Large Cap Index ETF',
    nameEn: 'Nippon Sensex BeES ETF',
    nameGu: 'સેન્સેક્સ બીઝ ઈટીએફ',
    nameHi: 'सेंसेक्स बीज़ ईटीएफ',
    tracks: 'Tracks BSE SENSEX (30 largest BSE companies)',
  },
  {
    pattern: /nifty\s*bees|niftybees|નિફ્ટી\s*(બીઝ|ઈટીએફ|ઇટીએફ)|निफ्टी\s*(बीज़|बीज|ईटीएफ)/i,
    symbol: 'NIFTYBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Large Cap Index ETF',
    nameEn: 'Nifty BeES ETF',
    nameGu: 'નિફ્ટી બીઝ ઈટીએફ',
    nameHi: 'निफ्टी बीज़ ईटीएफ',
    tracks: 'Tracks NIFTY 50 index (top 50 Indian companies)',
  },
  {
    pattern: /sbi\s*nifty\s*(50\s*)?etf|setfnif50|એસબીઆઈ\s*નિફ્ટી\s*(ઈટીએફ|ઇટીએફ)|एसबीआई\s*निफ्टी\s*ईटीएफ/i,
    symbol: 'SETFNIF50.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Large Cap Index ETF',
    nameEn: 'SBI Nifty 50 ETF',
    nameGu: 'એસબીઆઈ નિફ્ટી ઈટીએફ',
    nameHi: 'एसबीआई निफ्टी ईटीएफ',
    tracks: 'Tracks NIFTY 50 index managed by SBI Mutual Fund',
  },
  {
    pattern: /hdfc\s*nifty\s*(50\s*)?etf|hdfcnifty|એચડીએફસી\s*નિફ્ટી\s*(ઈટીએફ|ઇટીએફ)|एचडीएफसी\s*निफ्टी\s*ईटीएफ/i,
    symbol: 'HDFCNIFTY.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Large Cap Index ETF',
    nameEn: 'HDFC Nifty 50 ETF',
    nameGu: 'એચડીએફસી નિફ્ટી ઈટીએફ',
    nameHi: 'एचडीएफसी निफ्टी ईटीएफ',
    tracks: 'Tracks NIFTY 50 index managed by HDFC Mutual Fund',
  },
  {
    pattern: /hdfc\s*gold\s*etf|hdfcgold|એચડીએફસી\s*ગોલ્ડ\s*(ઈટીએફ|ઇટીએફ)|एचडीएफसी\s*गोल्ड\s*ईटीएफ/i,
    symbol: 'HDFCGOLD.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Gold Commodity ETF',
    nameEn: 'HDFC Gold ETF',
    nameGu: 'એચડીએફસી ગોલ્ડ ઈટીએફ',
    nameHi: 'एचडीएफसी गोल्ड ईटीएफ',
    tracks: 'Tracks domestic physical Gold prices',
  },
  {
    pattern: /gold\s*bees|goldbees|gold\s*etf|ગોલ્ડ\s*(બીઝ|ઈટીએફ|ઇટીએફ)|સોના\s*(નો\s*)?ઈટીએફ|गोल्ड\s*(बीज़|बीज|ईटीएफ)|सोने\s*का\s*ईटीएफ/i,
    symbol: 'GOLDBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Gold Commodity ETF',
    nameEn: 'Gold BeES ETF',
    nameGu: 'ગોલ્ડ બીઝ ઈટીએફ',
    nameHi: 'गोल्ड बीज़ ईटीएफ',
    tracks: 'Tracks physical Gold prices in India without making charges or storage risk',
  },
  {
    pattern: /silver\s*bees|silverbees|silver\s*etf|સિલ્વર\s*(બીઝ|ઈટીએફ|ઇટીએફ)|ચાંદી\s*(નો\s*)?ઈટીએફ|सिल्वर\s*(बीज़|बीज|ईटीएफ)|चांदी\s*का\s*ईटीएफ/i,
    symbol: 'SILVERBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Silver Commodity ETF',
    nameEn: 'Silver BeES ETF',
    nameGu: 'સિલ્વર બીઝ ઈટીએફ',
    nameHi: 'सिल्वर बीज़ ईटीएफ',
    tracks: 'Tracks physical Silver prices in India',
  },
  {
    pattern: /psu\s*bank\s*(bees|etf)|psubnkbees|પીએસયુ\s*બેંક\s*(બીઝ|ઈટીએફ)|पीएसयू\s*बैंक\s*(बीज़|ईटीएफ)/i,
    symbol: 'PSUBNKBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Sectoral Banking ETF',
    nameEn: 'PSU Bank BeES ETF',
    nameGu: 'પીએસયુ બેંક બીઝ ઈટીએફ',
    nameHi: 'पीएसयू बैंक बीज़ ईटीएफ',
    tracks: 'Tracks Nifty PSU Bank index (government-owned Indian banks)',
  },
  {
    pattern: /bank\s*bees|bankbees|bank\s*etf|બેંક\s*(બીઝ|ઈટીએફ|ઇટીએફ)|बैंक\s*(बीज़|बीज|ईटीएफ)/i,
    symbol: 'BANKBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Sectoral Banking ETF',
    nameEn: 'Bank BeES ETF',
    nameGu: 'બેંક બીઝ ઈટીએફ',
    nameHi: 'बैंक बीज़ ईटीएफ',
    tracks: 'Tracks Nifty Bank index (top 12 Indian banking stocks)',
  },
  {
    pattern: /junior\s*bees|juniorbees|nifty\s*next\s*50\s*etf|જુનિયર\s*બીઝ|जूनियर\s*बीज़/i,
    symbol: 'JUNIORBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Large Cap Next 50 ETF',
    nameEn: 'Junior BeES ETF',
    nameGu: 'જુનિયર બીઝ ઈટીએફ',
    nameHi: 'जूनियर बीज़ ईटीएफ',
    tracks: 'Tracks Nifty Next 50 index (companies ranked 51-100 on NSE)',
  },
  {
    pattern: /mid\s*150\s*bees|midcap\s*150\s*(bees|etf)|mid150bees|મિડકેપ\s*(બીઝ|ઈટીએફ)|मिडकैप\s*(बीज़|ईटीएफ)/i,
    symbol: 'MID150BEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Midcap ETF',
    nameEn: 'Midcap 150 BeES ETF',
    nameGu: 'મિડકેપ ૧૫૦ બીઝ ઈટીએફ',
    nameHi: 'मिडकैप 150 बीज़ ईटीएफ',
    tracks: 'Tracks Nifty Midcap 150 index',
  },
  {
    pattern: /\bit\s*bees\b|itbees|\bit\s*etf\b|આઈટી\s*(બીઝ|ઈટીએફ)|આઇટી\s*(બીઝ|ઇટીએફ)|आईटी\s*(बीज़|ईटीएफ)/i,
    symbol: 'ITBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Sectoral IT ETF',
    nameEn: 'Nifty IT BeES ETF',
    nameGu: 'આઈટી બીઝ ઈટીએફ',
    nameHi: 'आईटी बीज़ ईटीएफ',
    tracks: 'Tracks Nifty IT index (TCS, Infosys, Wipro, HCL Tech, etc.)',
  },
  {
    pattern: /pharma\s*bees|pharmabees|pharma\s*etf|ફાર્મા\s*(બીઝ|ઈટીએફ)|फार्मा\s*(बीज़|ईटीएफ)/i,
    symbol: 'PHARMABEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Sectoral Pharma ETF',
    nameEn: 'Pharma BeES ETF',
    nameGu: 'ફાર્મા બીઝ ઈટીએફ',
    nameHi: 'फार्मा बीज़ ईटीएफ',
    tracks: 'Tracks Nifty Pharma index (Sun Pharma, Cipla, Dr Reddy, etc.)',
  },
  {
    pattern: /auto\s*bees|autobees|auto\s*etf|ઓટો\s*(બીઝ|ઈટીએફ)|ऑटो\s*(बीज़|ईटीएफ)/i,
    symbol: 'AUTOBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Sectoral Auto ETF',
    nameEn: 'Auto BeES ETF',
    nameGu: 'ઓટો બીઝ ઈટીએફ',
    nameHi: 'ऑटो बीज़ ईटीएफ',
    tracks: 'Tracks Nifty Auto index (Maruti, Tata Motors, M&M, Bajaj Auto)',
  },
  {
    pattern: /liquid\s*bees|liquidbees|liquid\s*etf|લિક્વિડ\s*(બીઝ|ઈટીએફ)|लिक्विड\s*(बीज़|ईटीएफ)/i,
    symbol: 'LIQUIDBEES.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'Debt / Overnight Liquid ETF',
    nameEn: 'Liquid BeES ETF',
    nameGu: 'લિક્વિડ બીઝ ઈટીએફ',
    nameHi: 'लिक्विड बीज़ ईटीएफ',
    tracks: 'Low-risk overnight money market / cash-equivalent ETF',
  },
  {
    pattern: /cpse\s*etf|cpseetf|સીપીએસઈ\s*(ઈટીએફ|ઇટીએફ)|सीपीएसई\s*ईटीएफ/i,
    symbol: 'CPSEETF.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'PSU Thematic ETF',
    nameEn: 'CPSE ETF',
    nameGu: 'સીપીએસઈ ઈટીએફ',
    nameHi: 'सीपीएसई ईटीएफ',
    tracks: 'Tracks government-owned Central Public Sector Enterprises (NTPC, ONGC, Power Grid, Coal India, BEL)',
  },
  {
    pattern: /bharat\s*22|icicib22|ભારત\s*22|ભારત\s*૨૨|भारत\s*22/i,
    symbol: 'ICICIB22.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'PSU & Blue-chip Thematic ETF',
    nameEn: 'Bharat 22 ETF',
    nameGu: 'ભારત ૨૨ ઈટીએફ',
    nameHi: 'भारत 22 ईटीएफ',
    tracks: 'Tracks S&P BSE Bharat 22 index (22 PSU & select private blue-chips)',
  },
  {
    pattern: /mon100|nasdaq\s*100|nasdaq\s*etf|નાસ્ડેક|नैस्डैक/i,
    symbol: 'MON100.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'International US Tech ETF',
    nameEn: 'Motilal Nasdaq 100 ETF',
    nameGu: 'નાસ્ડેક ૧૦૦ ઈટીએફ',
    nameHi: 'नैस्डैक 100 ईटीएफ',
    tracks: 'Tracks US Nasdaq 100 index (Apple, Microsoft, Nvidia, Google, Amazon) in INR',
  },
  {
    pattern: /mafang|fang\s*etf|ફેંગ\s*ઈટીએફ|फैंग\s*ईटीएफ/i,
    symbol: 'MAFANG.NS',
    exchange: 'NSE',
    assetType: 'etf',
    category: 'International US Tech ETF',
    nameEn: 'Mirae NYSE FANG+ ETF',
    nameGu: 'ફેંગ પ્લસ ઈટીએફ',
    nameHi: 'फैंग प्लस ईटीएफ',
    tracks: 'Tracks 10 US mega-cap tech & growth stocks in INR',
  },
];

export const KNOWN_INDIAN_STOCKS: KnownStockEntry[] = [
  ...KNOWN_INDIAN_ETFS,
  ...KNOWN_INDIAN_INDICES,
  {
    pattern: /wipro|vipro|wirpo|વિપ્રો|વીપ્રો|विप्रो/i,
    symbol: 'WIPRO.NS',
    nameEn: 'Wipro',
    nameGu: 'વિપ્રો',
    nameHi: 'विप्रो',
  },
  {
    pattern: /reliance|rilayans|રિલાયન્સ|રીલાયન્સ|रिलायंस/i,
    symbol: 'RELIANCE.NS',
    nameEn: 'Reliance Industries',
    nameGu: 'રિલાયન્સ',
    nameHi: 'रिलायंस',
  },
  {
    pattern: /\btcs\b|tata consultancy|ટીસીએસ|टीसीएस/i,
    symbol: 'TCS.NS',
    nameEn: 'TCS',
    nameGu: 'ટીસીએસ',
    nameHi: 'टीसीएस',
  },
  {
    pattern: /hdfc bank|hdfc|એચડીએફસી|एचडीएफसी/i,
    symbol: 'HDFCBANK.NS',
    nameEn: 'HDFC Bank',
    nameGu: 'એચડીએફસી બેંક',
    nameHi: 'एचडीएफसी बैंक',
  },
  {
    pattern: /\bsbi\b|sbin|state bank|એસબીઆઈ|એસબીઆઇ|સ્ટેટ બેંક|एसबीआई|स्टेट बैंक/i,
    symbol: 'SBIN.NS',
    nameEn: 'State Bank of India',
    nameGu: 'એસબીઆઈ બેંક',
    nameHi: 'एसबीआई बैंक',
  },
  {
    pattern: /tata motors|tmpv|tatamotors|ટાટા મોટર્સ|टाटा मोटर्स/i,
    symbol: 'TMPV.NS',
    nameEn: 'Tata Motors',
    nameGu: 'ટાટા મોટર્સ',
    nameHi: 'टाटा मोटर्स',
  },
  {
    pattern: /tata steel|tatasteel|ટાટા સ્ટીલ|टाटा स्टील/i,
    symbol: 'TATASTEEL.NS',
    nameEn: 'Tata Steel',
    nameGu: 'ટાટા સ્ટીલ',
    nameHi: 'टाटा स्टील',
  },
  {
    pattern: /tata power|tatapower|ટાટા પાવર|टाटा पावर/i,
    symbol: 'TATAPOWER.NS',
    nameEn: 'Tata Power',
    nameGu: 'ટાટા પાવર',
    nameHi: 'टाटा पावर',
  },
  {
    pattern: /tata consumer|tataconsum|ટાટા કન્ઝ્યુમર|टाटा कंज्यूमर/i,
    symbol: 'TATACONSUM.NS',
    nameEn: 'Tata Consumer',
    nameGu: 'ટાટા કન્ઝ્યુમર',
    nameHi: 'टाटा कंज्यूमर',
  },
  {
    pattern: /\bitc\b|આઈટીસી|આઇટીસી|आईटीसी/i,
    symbol: 'ITC.NS',
    nameEn: 'ITC',
    nameGu: 'આઈટીસી',
    nameHi: 'आईटीसी',
  },
  {
    pattern: /l&t|l and t|larsen|એલ એન્ડ ટી|લાર્સન|एल एंड टी|लार्सन/i,
    symbol: 'LT.NS',
    nameEn: 'Larsen & Toubro',
    nameGu: 'એલ એન્ડ ટી',
    nameHi: 'एल एंड टी',
  },
  {
    pattern: /infosys|infy|infosis|ઇન્ફોસિસ|ઈન્ફોસિસ|इंफोसिस|इन्फोसिस/i,
    symbol: 'INFY.NS',
    nameEn: 'Infosys',
    nameGu: 'ઇન્ફોસિસ',
    nameHi: 'इंफोसिस',
  },
  {
    pattern: /zomato|eternal|zometo|ઝોમેટો|ઝોમાટો|जोमैटो|ज़ोमैटो/i,
    symbol: 'ETERNAL.NS',
    nameEn: 'Zomato',
    nameGu: 'ઝોમેટો',
    nameHi: 'जोमैटो',
  },
  {
    pattern: /adani power|અદાણી પાવર|अदानी पावर|अदाणी पावर/i,
    symbol: 'ADANIPOWER.NS',
    nameEn: 'Adani Power',
    nameGu: 'અદાણી પાવર',
    nameHi: 'अदानी पावर',
  },
  {
    pattern: /adani port|અદાણી પોર્ટ|अदानी पोर्ट|अदाणी पोर्ट/i,
    symbol: 'ADANIPORTS.NS',
    nameEn: 'Adani Ports',
    nameGu: 'અદાણી પોર્ટ્સ',
    nameHi: 'अदानी पोर्ट्स',
  },
  {
    pattern: /adani green|અદાણી ગ્રીન|अदानी ग्रीन|अदाणी ग्रीन/i,
    symbol: 'ADANIGREEN.NS',
    nameEn: 'Adani Green',
    nameGu: 'અદાણી ગ્રીન',
    nameHi: 'अदानी ग्रीन',
  },
  {
    pattern: /adani|adanient|અદાણી|अदानी|अदाणी/i,
    symbol: 'ADANIENT.NS',
    nameEn: 'Adani Enterprises',
    nameGu: 'અદાણી એન્ટરપ્રાઇઝ',
    nameHi: 'अदानी एंटरप्राइजेज',
  },
  {
    pattern: /icici|આઈસીઆઈસીઆઈ|આઇસીઆઇસીઆઇ|आईसीआईसीआई/i,
    symbol: 'ICICIBANK.NS',
    nameEn: 'ICICI Bank',
    nameGu: 'આઈસીઆઈસીઆઈ બેંક',
    nameHi: 'आईसीआईसीआई बैंक',
  },
  {
    pattern: /kotak|કોટક|कोटक/i,
    symbol: 'KOTAKBANK.NS',
    nameEn: 'Kotak Mahindra Bank',
    nameGu: 'કોટક બેંક',
    nameHi: 'कोटक बैंक',
  },
  {
    pattern: /axis bank|axis|એક્સિસ|एक्सिस/i,
    symbol: 'AXISBANK.NS',
    nameEn: 'Axis Bank',
    nameGu: 'એક્સિસ બેંક',
    nameHi: 'एक्सिस बैंक',
  },
  {
    pattern: /bajaj finance|bajfinance|બજાજ ફાઇનાન્સ|બજાજ ફાઈનાન્સ|बजाज फाइनेंस/i,
    symbol: 'BAJFINANCE.NS',
    nameEn: 'Bajaj Finance',
    nameGu: 'બજાજ ફાઇનાન્સ',
    nameHi: 'बजाज फाइनेंस',
  },
  {
    pattern: /bajaj auto|બજાજ ઓટો|बजाज ऑटो/i,
    symbol: 'BAJAJ-AUTO.NS',
    nameEn: 'Bajaj Auto',
    nameGu: 'બજાજ ઓટો',
    nameHi: 'बजाज ऑटो',
  },
  {
    pattern: /maruti|મારુતિ|મારૂતિ|मारुति/i,
    symbol: 'MARUTI.NS',
    nameEn: 'Maruti Suzuki',
    nameGu: 'મારુતિ સુઝુકી',
    nameHi: 'मारुति सुजुकी',
  },
  {
    pattern: /tech mahindra|techm|ટેક મહિન્દ્રા|टेक महिंद्रा/i,
    symbol: 'TECHM.NS',
    nameEn: 'Tech Mahindra',
    nameGu: 'ટેક મહિન્દ્રા',
    nameHi: 'टेक महिंद्रा',
  },
  {
    pattern: /mahindra|m&m|મહિન્દ્રા|महिंद्रा/i,
    symbol: 'M&M.NS',
    nameEn: 'Mahindra & Mahindra',
    nameGu: 'મહિન્દ્રા',
    nameHi: 'महिंद्रा',
  },
  {
    pattern: /airtel|bharti|એરટેલ|ભારતી|एयरटेल|भारती/i,
    symbol: 'BHARTIARTL.NS',
    nameEn: 'Bharti Airtel',
    nameGu: 'એરટેલ',
    nameHi: 'एयरटेल',
  },
  {
    pattern: /jio fin|jiofin|જિયો|જીયો|जियो/i,
    symbol: 'JIOFIN.NS',
    nameEn: 'Jio Financial',
    nameGu: 'જિયો ફાઇનાન્શિયલ',
    nameHi: 'जियो फाइनेंशियल',
  },
  {
    pattern: /sun pharma|sunpharma|સન ફાર્મા|सन फार्मा/i,
    symbol: 'SUNPHARMA.NS',
    nameEn: 'Sun Pharma',
    nameGu: 'સન ફાર્મા',
    nameHi: 'सन फार्मा',
  },
  {
    pattern: /cipla|sipla|સિપ્લા|સીપ્લા|सिप्ला/i,
    symbol: 'CIPLA.NS',
    nameEn: 'Cipla',
    nameGu: 'સિપ્લા',
    nameHi: 'सिप्ला',
  },
  {
    pattern: /dr reddy|drreddy|ડોક્ટર રેડ્ડી|डॉक्टर रेड्डी/i,
    symbol: 'DRREDDY.NS',
    nameEn: 'Dr.Reddy Labs',
    nameGu: 'ડોક્ટર રેડ્ડી',
    nameHi: 'डॉक्टर रेड्डी',
  },
  {
    pattern: /titan|ટાઇટન|ટાઈટન|टाइटन/i,
    symbol: 'TITAN.NS',
    nameEn: 'Titan',
    nameGu: 'ટાઇટન',
    nameHi: 'टाइटन',
  },
  {
    pattern: /asian paint|asianpaint|એશિયન પેઇન્ટ|એશિયન પેઈન્ટ|एशियन पेंट/i,
    symbol: 'ASIANPAINT.NS',
    nameEn: 'Asian Paints',
    nameGu: 'એશિયન પેઇન્ટ્સ',
    nameHi: 'एशियन पेंट्स',
  },
  {
    pattern: /hcl tech|hcltech|\bhcl\b|એચસીએલ|एचसीएल/i,
    symbol: 'HCLTECH.NS',
    nameEn: 'HCL Tech',
    nameGu: 'એચસીએલ ટેક',
    nameHi: 'एचसीएल टेक',
  },
  {
    pattern: /ultratech|અલ્ટ્રાટેક|अल्ट्राटेक/i,
    symbol: 'ULTRACEMCO.NS',
    nameEn: 'UltraTech Cement',
    nameGu: 'અલ્ટ્રાટેક સિમેન્ટ',
    nameHi: 'अल्ट्राटेक सीमेंट',
  },
  {
    pattern: /ambuja|અંબુજા|अंबुजा/i,
    symbol: 'AMBUJACEM.NS',
    nameEn: 'Ambuja Cements',
    nameGu: 'અંબુજા સિમેન્ટ',
    nameHi: 'अंबुजा सीमेंट',
  },
  {
    pattern: /\bntpc\b|એનટીપીસી|एनटीपीसी/i,
    symbol: 'NTPC.NS',
    nameEn: 'NTPC',
    nameGu: 'એનટીપીસી',
    nameHi: 'एनटीपीसी',
  },
  {
    pattern: /power grid|powergrid|પાવર ગ્રીડ|पावर ग्रिड/i,
    symbol: 'POWERGRID.NS',
    nameEn: 'Power Grid',
    nameGu: 'પાવર ગ્રીડ',
    nameHi: 'पावर ग्रिड',
  },
  {
    pattern: /\bongc\b|ઓએનજીસી|ओएनजीसी/i,
    symbol: 'ONGC.NS',
    nameEn: 'ONGC',
    nameGu: 'ઓએનજીસી',
    nameHi: 'ओएनजीसी',
  },
  {
    pattern: /coal india|coalindia|કોલ ઈન્ડિયા|કોલ ઇન્ડિયા|कोल इंडिया/i,
    symbol: 'COALINDIA.NS',
    nameEn: 'Coal India',
    nameGu: 'કોલ ઈન્ડિયા',
    nameHi: 'कोल इंडिया',
  },
  {
    pattern: /vedanta|vedl|વેદાંતા|वेदांता/i,
    symbol: 'VEDL.NS',
    nameEn: 'Vedanta',
    nameGu: 'વેદાંતા',
    nameHi: 'वेदांता',
  },
  {
    pattern: /hindalco|હિન્ડાલ્કો|हिंडाल्को/i,
    symbol: 'HINDALCO.NS',
    nameEn: 'Hindalco',
    nameGu: 'હિન્ડાલ્કો',
    nameHi: 'हिंडाल्को',
  },
  {
    pattern: /jsw steel|jswsteel|\bjsw\b|જેએસડબલ્યુ|जेएसडब्ल्यू/i,
    symbol: 'JSWSTEEL.NS',
    nameEn: 'JSW Steel',
    nameGu: 'જેએસડબલ્યુ સ્ટીલ',
    nameHi: 'जेएसडब्ल्यू स्टील',
  },
  {
    pattern: /\bhal\b|hindustan aeronautics|એચએએલ|હિન્દુસ્તાન એરોનોટિક્સ|एचएएल/i,
    symbol: 'HAL.NS',
    nameEn: 'HAL',
    nameGu: 'એચએએલ',
    nameHi: 'एचएएल',
  },
  {
    pattern: /\bbel\b|bharat electronics|બીઈએલ|ભારત ઇલેક્ટ્રોનિક્સ|बीईएल/i,
    symbol: 'BEL.NS',
    nameEn: 'Bharat Electronics',
    nameGu: 'ભારત ઇલેક્ટ્રોનિક્સ',
    nameHi: 'भारत इलेक्ट्रॉनिक्स',
  },
  {
    pattern: /\bbhel\b|ભેલ|બીએચઈએલ|भेल|बीएचईएल/i,
    symbol: 'BHEL.NS',
    nameEn: 'BHEL',
    nameGu: 'ભેલ',
    nameHi: 'भेल',
  },
  {
    pattern: /irctc|આઈઆરસીટીસી|આઇઆરસીટીસી|आईआरसीटीसी/i,
    symbol: 'IRCTC.NS',
    nameEn: 'IRCTC',
    nameGu: 'આઈઆરસીટીસી',
    nameHi: 'आईआरसीटीसी',
  },
  {
    pattern: /irfc|આઈઆરએફસી|આઇઆરએફસી|आईआरएफसी/i,
    symbol: 'IRFC.NS',
    nameEn: 'IRFC',
    nameGu: 'આઈઆરએફસી',
    nameHi: 'आईआरएफसी',
  },
  {
    pattern: /rvnl|આરવીએનએલ|आरवीएनएल/i,
    symbol: 'RVNL.NS',
    nameEn: 'RVNL',
    nameGu: 'આરવીએનએલ',
    nameHi: 'आरवीएनएल',
  },
  {
    pattern: /\blic\b|lici|એલઆઈસી|એલઆઇસી|एलआईसी/i,
    symbol: 'LICI.NS',
    nameEn: 'LIC',
    nameGu: 'એલઆઈસી',
    nameHi: 'एलआईसी',
  },
  {
    pattern: /paytm|પેટીએમ|पेटीएम/i,
    symbol: 'PAYTM.NS',
    nameEn: 'Paytm',
    nameGu: 'પેટીએમ',
    nameHi: 'पेटीएम',
  },
  {
    pattern: /suzlon|સુઝલોન|सुजलॉन|सुजलॉन/i,
    symbol: 'SUZLON.NS',
    nameEn: 'Suzlon Energy',
    nameGu: 'સુઝલોન',
    nameHi: 'सुजलॉन',
  },
  {
    pattern: /yes bank|yesbank|યસ બેંક|यस बैंक/i,
    symbol: 'YESBANK.NS',
    nameEn: 'Yes Bank',
    nameGu: 'યસ બેંક',
    nameHi: 'यस बैंक',
  },
  {
    pattern: /vodafone|idea|\bvi\b|વોડાફોન|આઈડિયા|वोडाफोन|आइडिया/i,
    symbol: 'IDEA.NS',
    nameEn: 'Vodafone Idea',
    nameGu: 'વોડાફોન આઈડિયા',
    nameHi: 'वोडाफोन आइडिया',
  },
  {
    pattern: /\bpnb\b|punjab national|પીએનબી|પંજાબ નેશનલ|पीएनबी|पंजाब नेशनल/i,
    symbol: 'PNB.NS',
    nameEn: 'Punjab National Bank',
    nameGu: 'પંજાબ નેશનલ બેંક',
    nameHi: 'पंजाब नेशनल बैंक',
  },
  {
    pattern: /bank of baroda|baroda|\bbob\b|બેંક ઓફ બરોડા|બરોડા બેંક|बैंक ऑफ बड़ौदा/i,
    symbol: 'BANKBARODA.NS',
    nameEn: 'Bank of Baroda',
    nameGu: 'બેંક ઓફ બરોડા',
    nameHi: 'बैंक ऑफ बड़ौदा',
  },
  {
    pattern: /canara bank|કેનેરા બેંક|केनरा बैंक/i,
    symbol: 'CANBK.NS',
    nameEn: 'Canara Bank',
    nameGu: 'કેનેરા બેંક',
    nameHi: 'केनरा बैंक',
  },
  {
    pattern: /union bank|યુનિયન બેંક|यूनियन बैंक/i,
    symbol: 'UNIONBANK.NS',
    nameEn: 'Union Bank',
    nameGu: 'યુનિયન બેંક',
    nameHi: 'यूनियन बैंक',
  },
  {
    pattern: /indusind|ઇન્ડસઇન્ડ|इंडसइंड/i,
    symbol: 'INDUSINDBK.NS',
    nameEn: 'IndusInd Bank',
    nameGu: 'ઇન્ડસઇન્ડ બેંક',
    nameHi: 'इंडसइंड बैंक',
  },
  {
    pattern: /britannia|બ્રિટાનિયા|ब्रिटानिया/i,
    symbol: 'BRITANNIA.NS',
    nameEn: 'Britannia',
    nameGu: 'બ્રિટાનિયા',
    nameHi: 'ब्रिटानिया',
  },
  {
    pattern: /nestle|નેસ્લે|नेस्ले/i,
    symbol: 'NESTLEIND.NS',
    nameEn: 'Nestle India',
    nameGu: 'નેસ્લે',
    nameHi: 'नेस्ले',
  },
  {
    pattern: /dabur|dabar|ડાબર|डाबर/i,
    symbol: 'DABUR.NS',
    nameEn: 'Dabur',
    nameGu: 'ડાબર',
    nameHi: 'डाबर',
  },
  {
    pattern: /hindustan unilever|\bhul\b|હિન્દુસ્તાન યુનિલિવર|हिंदुस्तान यूनिलीवर/i,
    symbol: 'HINDUNILVR.NS',
    nameEn: 'Hindustan Unilever',
    nameGu: 'હિન્દુસ્તાન યુનિલિવર',
    nameHi: 'हिंदुस्तान यूनिलीवर',
  },
  {
    pattern: /dmart|avenue supermarts|ડીમાર્ટ|डीमार्ट/i,
    symbol: 'DMART.NS',
    nameEn: 'DMart',
    nameGu: 'ડીમાર્ટ',
    nameHi: 'डीमार्ट',
  },
  {
    pattern: /pidilite|fevicol|પિડિલાઇટ|पिडिलाइट/i,
    symbol: 'PIDILITIND.NS',
    nameEn: 'Pidilite',
    nameGu: 'પિડિલાઇટ',
    nameHi: 'पिडिलाइट',
  },
  {
    pattern: /\bmrf\b|એમઆરએફ|एमआरएफ/i,
    symbol: 'MRF.NS',
    nameEn: 'MRF',
    nameGu: 'એમઆરએફ',
    nameHi: 'एमआरएफ',
  },
];

const INDIC_CONSONANTS: Record<string, string> = {
  // Gujarati
  ક: 'k', ખ: 'kh', ગ: 'g', ઘ: 'gh', ચ: 'ch', છ: 'chh', જ: 'j', ઝ: 'z',
  ટ: 't', ઠ: 'th', ડ: 'd', ઢ: 'dh', ણ: 'n', ત: 't', થ: 'th', દ: 'd', ધ: 'dh', ન: 'n',
  પ: 'p', ફ: 'f', બ: 'b', ભ: 'bh', મ: 'm', ય: 'y', ર: 'r', લ: 'l', ળ: 'l', વ: 'v',
  શ: 'sh', ષ: 'sh', સ: 's', હ: 'h',
  // Devanagari (Hindi)
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', च: 'ch', छ: 'chh', ज: 'j', झ: 'z',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n', त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'f', ब: 'b', भ: 'bh', म: 'm', य: 'y', र: 'r', ल: 'l', व: 'v',
  श: 'sh', ष: 'sh', स: 's', ह: 'h',
};

const INDIC_VOWELS: Record<string, string> = {
  અ: 'a', આ: 'a', ઇ: 'i', ઈ: 'i', ઉ: 'u', ઊ: 'u', એ: 'e', ઐ: 'ai', ઓ: 'o', ઔ: 'au',
  अ: 'a', आ: 'a', इ: 'i', ई: 'i', उ: 'u', ऊ: 'u', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
};

const INDIC_MATRAS: Record<string, string> = {
  'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
  'ં': 'n', '્': '', 'ૅ': 'e', 'ૉ': 'o', 'ૃ': 'ru',
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', '्': '', 'ॅ': 'e', 'ॉ': 'o', 'ृ': 'ri', '़': '',
};

export function transliterateIndicToLatin(text: string): string {
  const words = text.trim().split(/\s+/);
  const outWords: string[] = [];

  for (const word of words) {
    // Strip Gujarati/Hindi possessive suffixes like નો, ની, ના, નું, ને before transliterating
    const cleanWord = word.replace(/(નો|ની|ના|નું|ને|માં|થી|का|की|के|को)$/u, '');
    if (!cleanWord) continue;

    if (/^[a-zA-Z0-9.&-]+$/.test(cleanWord)) {
      outWords.push(cleanWord);
      continue;
    }

    const chars = Array.from(cleanWord);
    let latin = '';
    for (let i = 0; i < chars.length; i += 1) {
      const c = chars[i];
      const next = chars[i + 1];
      if (INDIC_CONSONANTS[c]) {
        latin += INDIC_CONSONANTS[c];
        if (next && INDIC_MATRAS[next] !== undefined) {
          latin += INDIC_MATRAS[next];
          i += 1;
        } else if (i < chars.length - 1 && (INDIC_CONSONANTS[next] || INDIC_VOWELS[next])) {
          latin += 'a';
        }
      } else if (INDIC_VOWELS[c]) {
        latin += INDIC_VOWELS[c];
      } else if (INDIC_MATRAS[c] !== undefined) {
        latin += INDIC_MATRAS[c];
      } else if (/[a-zA-Z0-9]/.test(c)) {
        latin += c;
      }
    }
    if (latin) outWords.push(latin);
  }

  return outWords.join(' ');
}

const CONVERSATIONAL_STOPWORDS = new Set([
  'ha', 'haan', 'dada', 'dadaji', 'ek', 'sec', 'second', 'minute', 'chalo', 'hu', 'hun',
  'atyare', 'hal', 'haal', 'bhav', 'bhaav', 'price', 'rate', 'share', 'stock', 'no', 'ni',
  'na', 'nu', 'su', 'shu', 'chhe', 'che', 'tapasu', 'tapasi', 'chhu', 'chu', 'jou', 'jovu',
  'shodhu', 'gotu', 'batavu', 'kahu', 'kaho', 'umero', 'umeru', 'umervo', 'kadho', 'kadhi',
  'nakho', 'nakhvo', 'remove', 'add', 'check', 'checking', 'let', 'me', 'the', 'of', 'for',
  'you', 'right', 'now', 'what', 'is', 'please', 'tell', 'kya', 'hai', 'ka', 'ki', 'ke',
  'batao', 'bataiye', 'dekhta', 'dekhti', 'ढूँढ', 'रहा', 'हूँ', 'जोड़ें', 'हटाएं', 'लाईए',
  'laiye', 'karu', 'kari', 'lau', 'laie', 'ketlo', 'ketla', 'par', 'ma', 'list',
]);

export function isIndexSymbol(symbol: string): boolean {
  return symbol.trim().startsWith('^');
}

export function inferAssetType(symbol: string, quoteType?: string): AssetType {
  const upper = symbol.trim().toUpperCase();
  if (upper.startsWith('^') || quoteType === 'INDEX') return 'index';
  if (
    quoteType === 'ETF' ||
    KNOWN_INDIAN_ETFS.some((e) => e.symbol === upper) ||
    /(BEES|ETF|IETF)\.(NS|BO)$/i.test(upper)
  ) {
    return 'etf';
  }
  return 'stock';
}

export function normalizeStockSearchQuery(rawQuery: string): string {
  const trimmed = rawQuery.trim();
  if (!trimmed) return '';

  for (const entry of KNOWN_INDIAN_STOCKS) {
    if (entry.pattern.test(trimmed)) {
      return entry.symbol;
    }
  }

  // If query has Gujarati or Devanagari script, transliterate and strip conversational filler words
  if (/[\u0900-\u0AFF]/u.test(trimmed)) {
    const latin = transliterateIndicToLatin(trimmed);
    const tokens = latin
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !CONVERSATIONAL_STOPWORDS.has(t.toLowerCase()));
    return tokens.join(' ') || latin;
  }

  return trimmed;
}

export interface ExtractedVoiceAction {
  action: 'price' | 'add' | 'remove' | 'confirm_yes' | 'confirm_no' | 'none';
  query: string;
  knownStock?: StockItem;
}

export function checkConfirmation(text: string): 'yes' | 'no' | 'none' {
  const padded = ' ' + text.trim().toLowerCase() + ' ';
  const rawPadded = ' ' + text.trim() + ' ';

  // Check NO first to prevent phrases like "ના કાઢશો નહીં" or "mat hatao" from being misread as YES
  const isNo =
    /(^|[\s,।!?.])(no|nope|nah|na|nahi|not|mat|cancel|keep|rahne\s*do|mat\s*hatao)([\s,।!?.])/i.test(padded) ||
    /(^|[\s,।!?.])(ના|નાજી|નહીં|નથી|नहीं|ना)([\s,।!?.])/u.test(rawPadded) ||
    /રહેવા\s*(દો|રાખો|દે)|रहने\s*દો|रहने\s*दो|મત\s*હટાવ|मत\s*हटा|નથી\s*કાઢ/u.test(text);

  if (isNo) return 'no';

  const isYes =
    /(^|[\s,।!?.])(yes|yeah|yep|sure|ok|okay|haan|ha|sahi|kar\s*do|hata\s*do|hatao)([\s,।!?.])/i.test(padded) ||
    /(^|[\s,।!?.])(હા|હાજી|હાસ્તો|ચોક્કસ|ભલે|हाँ|हां|हाँजी|सही)([\s,।!?.])/u.test(rawPadded) ||
    /કાઢી\s*(નાખો|દો|નાખ|કાઢ)|हटा\s*(दो|दीजिए|एं)|निकाल\s*(દો|दो|ના|ना)/u.test(text);

  if (isYes) return 'yes';
  return 'none';
}

export function extractVoiceActionFromTranscripts(
  userText: string,
  modelText: string,
  watchlist: StockItem[],
  hasPendingRemoval: boolean
): ExtractedVoiceAction {
  const combined = `${userText} ${modelText}`.trim();
  if (!combined) return { action: 'none', query: '' };

  if (hasPendingRemoval) {
    const confirmation = checkConfirmation(userText);
    if (confirmation === 'yes') {
      return { action: 'confirm_yes', query: '' };
    }
    if (confirmation === 'no') {
      return { action: 'confirm_no', query: '' };
    }
  }

  // Determine action type from userText or modelText
  let action: 'price' | 'add' | 'remove' = 'price';
  if (/કાઢ|દૂર|હટાવ|remove|delete|हटा|निकाल/i.test(combined)) {
    action = 'remove';
  } else if (/ઉમેર|એડ\b|\badd\b|જोड़|जोड|નવો શેર|नया शेयर/i.test(combined)) {
    action = 'add';
  }

  // 1. Check user's current watchlist first (essential for remove & watchlist price checks)
  for (const item of watchlist) {
    const bareTicker = item.symbol
      .replace(/^\^|\.(NS|BO)$/gi, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedEn = item.nameEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedGu = item.nameGu.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedHi = item.nameHi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${bareTicker}\\b|${escapedEn}|${escapedGu}|${escapedHi}`, 'i');
    if (re.test(combined)) {
      return { action, query: item.symbol, knownStock: item };
    }
  }

  // 2. Check our Known Indian Indices, ETFs & Stocks dictionary
  for (const entry of KNOWN_INDIAN_STOCKS) {
    if (entry.pattern.test(combined)) {
      return {
        action,
        query: entry.symbol,
        knownStock: {
          symbol: entry.symbol,
          exchange: entry.exchange ?? (entry.symbol.endsWith('.BO') ? 'BSE' : 'NSE'),
          assetType: entry.assetType ?? inferAssetType(entry.symbol),
          nameEn: entry.nameEn,
          nameGu: entry.nameGu,
          nameHi: entry.nameHi,
        },
      };
    }
  }

  // 3. Extract any explicit English company name tokens from combined transcript
  const englishMatches = combined.match(/\b[A-Za-z][A-Za-z0-9&-]{2,20}\b/g) ?? [];
  const filteredEn = englishMatches.filter((w) => !CONVERSATIONAL_STOPWORDS.has(w.toLowerCase()));
  if (filteredEn.length > 0) {
    return { action, query: filteredEn.slice(0, 2).join(' ') };
  }

  // 4. Phonetically transliterate Indic words and filter out conversational stopwords
  const transliterated = transliterateIndicToLatin(combined);
  const tokens = transliterated
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !CONVERSATIONAL_STOPWORDS.has(w.toLowerCase()));

  if (tokens.length > 0) {
    return { action, query: tokens.slice(0, 2).join(' ') };
  }

  return { action: 'none', query: '' };
}
