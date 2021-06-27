App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

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
        return App.render();
      });
    })
  },

  render: () => {
    web3.eth.getCoinbase(function(error, account) {
      if (error === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    });
  }
}

$(() => {
  $(window).on('load', function() {
    App.init();
  })
});
