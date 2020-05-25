// required confirmation for seled Tx
// we must wait fro at least this number of confirmation
// before initiating Tx in target blockchain
global.confTable = {
    "BTC": 6,   // 6  (60 min)
    "BCH": 15,   // 6  (60 min)
    "LTC": 12,   // 12 (30 min)
    "ETH": 30,   // 30 (6 min)
    "XLM": 1,
    "XRP": 1,
    "EOS": 1,
    "WBI": 1,
    "TBTC": 0,
    "TBCH": 0,
    "TLTC": 0,
    "TETH": 1,
    "TXLM": 1,
    "TXRP": 1,
    "TEOS": 1,
    "TWBI": 1,
    "TLOS": 1
}