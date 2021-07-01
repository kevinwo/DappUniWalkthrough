App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: () => {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: async () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    // Modern dapp browsers...
    if (window.ethereum) {
      window.web3 = new Web3(ethereum)
      try {
        // Request account access if needed
        await ethereum.enable()
        // Accounts now exposed
        web3.eth.sendTransaction({/* ... */})
      } catch (error) {
        // User denied account access...
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = web3.currentProvider
      window.web3 = new Web3(web3.currentProvider)
      // Acccounts always exposed
      web3.eth.sendTransaction({/* ... */})
    }
    // Non-dapp browsers...
    else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
    return App.initContracts();
  },

  initContracts: () => {
    $.getJSON("DappTokenSale.json", (dappTokenSale) => {
      App.contracts.DappTokenSale = TruffleContract(dappTokenSale);
      App.contracts.DappTokenSale.setProvider(App.web3Provider);
      App.contracts.DappTokenSale.deployed().then((sale) => {
        console.log("Dapp Token Sale Address:", sale.address);
      });
    })
    .done(() => {
      $.getJSON("DappToken.json", (dappToken) => {
        App.contracts.DappToken = TruffleContract(dappToken);
        App.contracts.DappToken.setProvider(App.web3Provider);
        App.contracts.DappToken.deployed().then((token) => {
          console.log("Dapp Token Address:", token.address);
        });
        App.listenForEvents();

        return App.render();
      });
    })
  },

  listenForEvents: () => {
    App.contracts.DappTokenSale.deployed().then((instance) => {
      instance.Sell({
        fromBlock: 0
      }, function(error, event) {
        App.render();
      });
    })
  },

  render: () => {
    if (App.loading) {
      return;
    }

    App.loading = true;

    var loader = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    web3.eth.getCoinbase(function(error, account) {
      if (error === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    });

    App.contracts.DappTokenSale.deployed().then((instance) => {
      dappTokenSaleInstance = instance;
      return dappTokenSaleInstance.tokenPrice();
    }).then((tokenPrice) => {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.utils.fromWei(App.tokenPrice, "ether"));
      return dappTokenSaleInstance.tokensSold();
    }).then((tokensSold) => {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);

      var progressPercent = (App.tokensSold / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      App.contracts.DappToken.deployed().then((instance) => {
        dappTokenInstance = instance;
        return dappTokenInstance.balanceOf(App.account);
      }).then((balance) => {
        $('.dapp-balance').html(balance.toNumber());

        App.loading = false;
        loader.hide();
        content.show();
      });
    });
  },

  buyTokens: () => {
    $('#content').hide();
    $('#loader').show();
    var numberOfTokens = $('#numberOfTokens').val();

    App.contracts.DappTokenSale.deployed().then((instance) => {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000
      }).then((result) => {
        console.log("Tokens bought...");
        $('form').trigger('reset');
        // Wait for Sell event
      });
    });
  }
}

$(() => {
  $(document).ready(function() {
    App.init();
  })
});
