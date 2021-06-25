var DappTokenSale = artifacts.require('./DappTokenSale.sol');
var DappToken = artifacts.require('./DappToken.sol');

contract('DappTokenSale', (accounts) => {
  const tokenPrice = 1000000000000000;
  const tokensAvailable = 750000;
  const admin = accounts[0];
  const buyer = accounts[1];
  var tokenSaleInstance;

  // TEST LIFE CYCLE

  beforeEach(async () => {
    tokenSaleInstance = await DappTokenSale.deployed()
  })

  // TESTS

  // constructor(_tokenContract, _tokenPrice)

  describe('constructor', () => {
    it('should have a contract address', async () => {
      assert.notEqual(await tokenSaleInstance.address, 0x0, 'missing contract address')
    })

    it('should have a token contract address', async () => {
      assert.notEqual(await tokenSaleInstance.tokenContract(), 0x0, 'missing token contract address')
    })

    it('should have a token price', async () => {
      assert.equal(await tokenSaleInstance.tokenPrice(), tokenPrice, 'incorrect token price')
    })
  })

  // buyTokens(_numberOfTokens)

  describe('buyTokens', () => {
    let tokenInstance;
    let numberOfTokens;    
    var receipt;
    var value;

    before(async () => {
      tokenInstance = await DappToken.deployed()
      tokenInstance.transfer(tokenSaleInstance.address, tokensAvailable, { from: admin })
      numberOfTokens = 10
    })

    describe('when paying with correct value', () => {
      before(async () => {
        // given
        value = 10 * tokenPrice

        // when
        receipt = await tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: value })
      })

      // then
      it('should produce a valid receipt', () => {
        assert.equal(receipt.logs.length, 1, 'triggers one event')
        assert.equal(receipt.logs[0].event, 'Sell', 'should be Sell event')
        assert.equal(receipt.logs[0].args._buyer, buyer, 'logs the account that purchased the tokens')
        assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased')
      })

      it('should incrememnt the number of tokens sold', async () => {
        assert.equal(await tokenSaleInstance.tokensSold(), numberOfTokens, 'failed to increment')
      })

      it('should increment the balance of the buyer', async () => {
        const balance = await tokenInstance.balanceOf(buyer);
        assert.equal(balance, numberOfTokens);
      })

      it('should deduct the tokens sold from the sale', async () => {
        const balance = await tokenInstance.balanceOf(tokenSaleInstance.address);
        assert.equal(balance, tokensAvailable - numberOfTokens);
      })
    })

    describe('when paying with incorrect token value', () => {
      before(() => {
        // given
        value = 1
      })

      it('should throw an error', async () => {
        try {
          // when
          await tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: value })
          throw 'FAIL'
        } catch (error) {
          // then
          assert(error.message.includes('revert'), true, 'cannot')
        }
      })
    })

    describe('when attempting to buy more tokens than are available', () => {
      before(() => {
        // given
        value = 1
      })

      it('should throw an error', async () => {
        try {
          // when
          await tokenSaleInstance.buyTokens(800000, { from: buyer, value: value * tokenPrice })
        } catch (error) {
          // then
          assert(error.message.includes('revert'), true, 'cannot')
        }
      })
    })
  })

  // endSale()

  describe('endSale', () => {
    let tokenInstance;
    var receipt;
    var user;

    before(async () => {
      tokenInstance = await DappToken.deployed()
    })

    describe('when the user is a buyer', () => {
      before(() => {
        // given
        user = buyer
      })

      it('should throw an error', async () => {
        try {
          // when
          await tokenSaleInstance.endSale({ from: user })
          throw 'FAIL'
        } catch (error) {
          // then
          assert(error.message.includes('revert'), true, 'must be an admin to end sale')
        }
      })
    })

    describe('when the user is an admin', () => {
      before(async () => {
        // given
        user = admin

        // when
        receipt = await tokenSaleInstance.endSale({ from: user })
      })

      // then
      it('should complete with a receipt', () => {
        assert.isTrue(receipt.receipt.status);
      })

      it('should return all unsold tokens to admin', async () => {
        assert.equal(await tokenInstance.balanceOf(admin), 999990)
      })

      it('should set the sale balance to 0', async () => {
        assert.equal(await tokenInstance.balanceOf(tokenSaleInstance.address), 0)
      })
    })
  })
})