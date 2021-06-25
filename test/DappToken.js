var DappToken = artifacts.require("./DappToken.sol");

contract('DappToken', function(accounts) {
  var tokenInstance;

  beforeEach(async () => {
    tokenInstance = await DappToken.deployed()
  })

  it('initializes the contract with the correct values', function() {
    return DappToken.deployed().then(function(instance) {
      tokenInstance = instance;
      return tokenInstance.name();
    }).then(function(name) {
      assert.equal(name, 'DApp Token', 'has the correct name');
      return tokenInstance.symbol();
    }).then(function(symbol) {
      assert.equal(symbol, 'DAPP', 'has the correct symbol');
      return tokenInstance.standard();
    }).then(function(standard) {
      assert.equal(standard, 'Dapp Token v1.0', 'has the correct standard');
    });
  });

  it('allocates the supply upon deployment', function() {
    return DappToken.deployed().then(function(instance) {
      tokenInstance = instance;
      return tokenInstance.totalSupply();
    }).then(function(totalSupply) {
      assert.equal(totalSupply.toNumber(), 1000000, 'sets the total supply to 1,000,000');
      return tokenInstance.balanceOf(accounts[0]);
    }).then(function(adminBalance) {
        assert.equal(adminBalance.toNumber(), 1000000, 'it allocates the initial supply to the admin account');
    });
  });

  describe('transfer', () => {
    it('transfers token ownership', async() => {
      try {
        await tokenInstance.transfer.call(accounts[1], 99999999999999999999)
        assert.fail()
      } catch (error) {
        assert(error.message.includes('NUMERIC_FAULT'), true, 'invalid number value transferred')
      }

      const success = await tokenInstance.transfer.call(accounts[1], 250000, { from: accounts[0] })
      assert.isTrue(success)

      const receipt = await tokenInstance.transfer(accounts[1], 250000, { from: accounts[0] })

      assert.equal(receipt.logs.length, 1, 'triggers one event')
      assert.equal(receipt.logs[0].event, 'Transfer', 'should be Transfer event')
      assert.equal(receipt.logs[0].args._from, accounts[0], 'logs the account the tokens are transferred from')
      assert.equal(receipt.logs[0].args._to, accounts[1], 'logs the account the tokens are transferred to')
      assert.equal(receipt.logs[0].args._value, 250000, 'logs the amount transferred')

      const balanceReceiver = await tokenInstance.balanceOf(accounts[1])
      assert.equal(balanceReceiver.toNumber(), 250000, 'adds the amount to receiving account')
      const balanceSender = await tokenInstance.balanceOf(accounts[0])
      assert.equal(balanceSender.toNumber(), 750000, 'deducts amount from sending account')
    })
  })

  describe('approve', () => {
    it('approves tokens for delegated transfer', async() => {
      const success = await tokenInstance.approve.call(accounts[1], 100)
      assert.isTrue(success)

      const receipt = await tokenInstance.approve(accounts[1], 100)

      assert.equal(receipt.logs.length, 1, 'triggers one event')
      assert.equal(receipt.logs[0].event, 'Approval', 'should be Approval event')
      assert.equal(receipt.logs[0].args._owner, accounts[0], 'logs the owner account the tokens are transferred from')
      assert.equal(receipt.logs[0].args._spender, accounts[1], 'logs the spender account delegated to transfer the tokens')
      assert.equal(receipt.logs[0].args._value, 100, 'logs the amount transferred')

      const allowance = await tokenInstance.allowance(accounts[0], accounts[1]);
      assert.equal(allowance, 100, 'stores the allowance for delegated transfer')
    })
  })

  describe('transferFrom', () => {
    var fromAccount, toAccount, spendingAccount;

    before(async () => {
      // tokenInstance = await DappToken.deployed()
      fromAccount = accounts[2]
      toAccount = accounts[3]
      spendingAccount = accounts[4]

      await tokenInstance.transfer(fromAccount, 100, { from: accounts[0] })
      await tokenInstance.approve(spendingAccount, 10, { from: fromAccount })
    })

    describe('when the transfer amount is larger than the balance', () => {
      it('should throw an error', async () => {
        try {
          await tokenInstance.transferFrom(fromAccount, toAccount, 9999)
          // @TODO: Figure out a proper way to fail tests like this.
          throw 'FAIL'
        } catch (error) {
          assert(error.message.includes('revert'), true, 'cannot transfer value larger than balance')
        }
      })
    })

    describe('when the transfer amount is larger than the approved amount', () => {
      it('should throw an error', async () => {
        try {
          await tokenInstance.transferFrom(fromAccount, toAccount, 20, { from: spendingAccount })
          throw 'FAIL'
        } catch (error) {
          assert(error.message.includes('revert'), true, 'cannot transfer value larger than approved amount')
        }
      })
    })

    describe('when the transfer amount is within the balance and approved amount (call)', () => {
      var success;

      before(async () => {
        success = await tokenInstance.transferFrom.call(fromAccount, toAccount, 10, { from: spendingAccount })
      })

      it('should execute successfully', () => {
        assert.isTrue(success)
      })
    })

    describe('when the transfer amount is within the balance and approved amount', () => {
      var receipt;      

      before(async () => {
        receipt = await tokenInstance.transferFrom(fromAccount, toAccount, 10, { from: spendingAccount })
      })

      it('should produce a valid receipt', () => {
        assert.equal(receipt.logs.length, 1, 'triggers one event')
        assert.equal(receipt.logs[0].event, 'Transfer', 'should be Transfer event')
        assert.equal(receipt.logs[0].args._from, fromAccount, 'logs the account the tokens are transferred from')
        assert.equal(receipt.logs[0].args._to, toAccount, 'logs the account the tokens are transferred to')
        assert.equal(receipt.logs[0].args._value, 10, 'logs the amount transferred')
      })

      it('should deduct the amount from the sending account', async () => {
        const fromBalance = await tokenInstance.balanceOf(fromAccount)
        assert.equal(fromBalance, 90, 'deducts amount from sending account')
      })

      it('should add the amount to the receiving account', async () => {
        const toBalance = await tokenInstance.balanceOf(toAccount)
        assert.equal(toBalance, 10, 'deducts amount from receiving account')
      })

      it('should deduct the amount from the allowance', async () => {
        const allowance = await tokenInstance.allowance(fromAccount, spendingAccount)
        assert.equal(allowance, 0, 'deducts the amount from the allowance')
      })
    })
  })
})
