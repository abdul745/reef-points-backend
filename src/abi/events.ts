export const EVENT_ABIS = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount0In", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount1In", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount0Out", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount1Out", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "sender", "type": "address" },
      { "indexed": false, "name": "amount0", "type": "uint256" },
      { "indexed": false, "name": "amount1", "type": "uint256" }
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "sender", "type": "address" },
      { "indexed": false, "name": "amount0", "type": "uint256" },
      { "indexed": false, "name": "amount1", "type": "uint256" },
      { "indexed": true, "name": "to", "type": "address" }
    ],
    "name": "Burn",
    "type": "event"
  }
];
