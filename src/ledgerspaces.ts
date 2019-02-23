/**
 * Casinocoin ledger namespace prefixes.
 *
 * The Casinocoin ledger is a key-value store.
 * In order to avoid name collisions,
 * names are partitioned into namespaces.
 *
 * Each namespace is just a single character prefix.
 */
module.exports = {
    account: 'a',
    dirNode: 'd',
    generatorMap: 'g',
    casinocoinState: 'c',
    offer: 'o', // Entry for an offer.
    ownerDir: 'O', // Directory of things owned by an account.
    bookDir: 'B', // Directory of order books.
    contract: 'y',
    skipList: 's',
    amendment: 'f',
    feeSettings: 'e',
    signerList: 'S',
    escrow: 'u',
    paychan: 'x'
}
