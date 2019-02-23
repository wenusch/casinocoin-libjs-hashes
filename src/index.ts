import {BigNumber} from 'bignumber.js'
import {decodeAddress} from 'casinocoin-libjs-address-codec'
import {binary} from 'casinocoin-libjs-binary-codec'

const hashprefixes = require('hashprefixes')
const SHAMap = require('shamap').SHAMap
const SHAMapTreeNode = require ('shamap').SHAMapTreeNode
const ledgerspaces = require('./ledgerspaces')
const sha512half = require('./sha512half')

function hash(hex) {
  return sha512half(new Buffer(hex, 'hex'))
}

function padLeftZero(string, length) {
  return Array(length - string.length + 1).join('0') + string
}

function intToHex(integer, byteLength) {
  return padLeftZero(Number(integer).toString(16), byteLength * 2)
}

function bytesToHex(bytes) {
  return (new Buffer(bytes)).toString('hex')
}

function bigintToHex(integerString, byteLength) {
  const hex = (new BigNumber(integerString)).toString(16)
  return padLeftZero(hex, byteLength * 2)
}

function ledgerSpaceHex(name) {
  return intToHex(ledgerspaces[name].charCodeAt(0), 2)
}

function addressToHex(address) {
  return (new Buffer(decodeAddress(address))).toString('hex')
}

function currencyToHex(currency) {
  if (currency.length === 3) {
    const bytes = new Array(20 + 1).join('0').split('').map(parseFloat)
    bytes[12] = currency.charCodeAt(0) & 0xff
    bytes[13] = currency.charCodeAt(1) & 0xff
    bytes[14] = currency.charCodeAt(2) & 0xff
    return bytesToHex(bytes)
  }
  return currency
}

function addLengthPrefix(hex) {
  const length = hex.length / 2
  if (length <= 192) {
    return bytesToHex([length]) + hex
  } else if (length <= 12480) {
    const x = length - 193
    return bytesToHex([193 + (x >>> 8), x & 0xff]) + hex
  } else if (length <= 918744) {
    const x = length - 12481
    return bytesToHex([241 + (x >>> 16), x >>> 8 & 0xff, x & 0xff]) + hex
  }
  throw new Error('Variable integer overflow.')
}

function computeBinaryTransactionHash(txBlobHex) {
  const prefix = hashprefixes.HASH_TX_ID.toString(16).toUpperCase()
  return hash(prefix + txBlobHex)
}

function computeTransactionHash(txJSON) {
  return computeBinaryTransactionHash(binary.encode(txJSON))
}

function computeBinaryTransactionSigningHash(txBlobHex) {
  const prefix = hashprefixes.HASH_TX_SIGN.toString(16).toUpperCase()
  return hash(prefix + txBlobHex)
}

function computeTransactionSigningHash(txJSON) {
  return computeBinaryTransactionSigningHash(binary.encode(txJSON))
}

function computeAccountHash(address) {
  return hash(ledgerSpaceHex('account') + addressToHex(address))
}

function computeSignerListHash(address) {
  return hash(ledgerSpaceHex('signerList')+addressToHex(address)+'00000000')
}

function computeOrderHash(address, sequence) {
  const prefix = '00' + intToHex(ledgerspaces.offer.charCodeAt(0), 1)
  return hash(prefix + addressToHex(address) + intToHex(sequence, 4))
}

function computeTrustlineHash(address1, address2, currency) {
  const address1Hex = addressToHex(address1)
  const address2Hex = addressToHex(address2)

  const swap = (new BigNumber(address1Hex, 16)).greaterThan(
    new BigNumber(address2Hex, 16))
  const lowAddressHex = swap ? address2Hex : address1Hex
  const highAddressHex = swap ? address1Hex : address2Hex

  const prefix = ledgerSpaceHex('casinocoinState')
  return hash(prefix + lowAddressHex + highAddressHex +
    currencyToHex(currency))
}

function computeTransactionTreeHash(transactions, version) {
  const shamap = new SHAMap(version)

  transactions.forEach(function (txJSON) {
    const txBlobHex = binary.encode(txJSON)
    const metaHex = binary.encode(txJSON.metaData)
    const txHash = computeBinaryTransactionHash(txBlobHex)
    const data = addLengthPrefix(txBlobHex) + addLengthPrefix(metaHex)
    shamap.add_item(txHash, data, SHAMapTreeNode.TYPE_TRANSACTION_MD)
  })

  return shamap.hash()
}

function computeStateTreeHash(entries, version) {
  const shamap = new SHAMap(version)

  entries.forEach(function (ledgerEntry) {
    const data = binary.encode(ledgerEntry)
    shamap.add_item(ledgerEntry.index, data, SHAMapTreeNode.TYPE_ACCOUNT_STATE)
  })

  return shamap.hash()
}

// see casincoind Ledger::updateHash()
function computeLedgerHash(ledgerHeader) {
  const prefix = hashprefixes.HASH_LEDGER.toString(16).toUpperCase()
  return hash(prefix +
    intToHex(ledgerHeader.ledger_index, 4) +
    bigintToHex(ledgerHeader.total_coins, 8) +
    ledgerHeader.parent_hash +
    ledgerHeader.transaction_hash +
    ledgerHeader.account_hash +
    intToHex(ledgerHeader.parent_close_time, 4) +
    intToHex(ledgerHeader.close_time, 4) +
    intToHex(ledgerHeader.close_time_resolution, 1) +
    intToHex(ledgerHeader.close_flags, 1)
  )
}

function computeEscrowHash(address, sequence) {
  return hash(ledgerSpaceHex('escrow') + addressToHex(address) +
    intToHex(sequence, 4))
}

function computePaymentChannelHash(address, dstAddress, sequence) {
  return hash(ledgerSpaceHex('paychan') + addressToHex(address) +
    addressToHex(dstAddress) + intToHex(sequence, 4))
}

export {
  computeTransactionHash,
  computeBinaryTransactionHash,
  computeTransactionSigningHash,
  computeBinaryTransactionSigningHash,
  computeAccountHash,
  computeOrderHash,
  computeTrustlineHash,
  computeSignerListHash,
  computeStateTreeHash,
  computeTransactionTreeHash,
  computeLedgerHash,
  computeEscrowHash,
  computePaymentChannelHash
}
