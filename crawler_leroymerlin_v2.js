var cheerio = require("cheerio");
var request = require("request");
var async = require("async");
var waterfall = require('async-waterfall');
var fs = require("fs");


var countCategorie1 = 0;//max 13
var countCategorie2 = 0;
var countCategorie3 = 0;
var countProductPage = 0;
var options = {
  fileName: null,
  error: null,
  cb: null,
  $categorie1: null,
  $categorie2: null,
  $categorie3: null,
  $productPage: null,
  urlCategorie1: null,
  urlCategorie2: null,
  urlCategorie3: null,
  urlProduct: null
}
// process.on('SIGINT', function() {
//     console.log("Caught interrupt signal");
// 		console.log("nbProduct done: " + resultSave.productObject.counter);
// 		writeFileFunction(resultSave, function(result) {
// 			process.exit(1);
// 		});
// });

var logger = function (level, message)
{
	level = (level || "") + "";
	message = (message || "") + "";

	console.log('{"level":"' + level.toUpperCase() + '", "site": "Leroy Merlin", "message": "' + message + '"}');
};

function loadGenericPage(urlCrawl, callback) {
  var $ = null;
  var isLoaded = false;
	var numberOfWhile = 0;

	setTimeout(function() {
		async.whilst(
			function () { return isLoaded == false; },
			function (callbackIsLoaded) {
				request(urlCrawl, function (error, response, body) {
					if (error || response.statusCode != 200) {
						numberOfWhile ++;
						if (numberOfWhile == 1) {
							logger("INFO", "request reloading...");
							callbackIsLoaded();
							return ;
						}
						if (numberOfWhile > 10) {
							logger("error", "---- Page failed to Request ----");
							options.error = "Page failed to request";
							callback($);
							return ;
						}
						callbackIsLoaded();
						return ;
					}
          $ = cheerio.load(body);
          if ($("div.highlightTechniqueError h1").text().trim() == "Page indisponible") {
            $ = null;
            options.error("Page not available by the website");
            callback($);
            return ;
          }
          isLoaded = true;
          callbackIsLoaded();
          return ;
				});
			},
			function () {
				callback($);
				return ;
			}
		);
	}, 1000);
}

function crawlProductPage(callback) {
  loadGenericPage(options.urlCategorie3, function($) {
    if (options.error) {
      logger("error", options.error);
      options.error = null;
      callback();
      return ;
    }
    options.$productPage = $;
    var limit = null;
    var i = null;
    var tabSearch = [
      "[itemtype='http://schema.org/Product']",
      "div.container-product"
    ];
    if (options.$productPage("[itemtype='http://schema.org/Product']").length > 0) {
      limit = options.$productPage("[itemtype='http://schema.org/Product']").length;
      i = 0;
    }
    if (options.$productPage("div.container-product").length > 0 && options.$productPage("div.container-product").length > limit) {
      limit = options.$productPage("div.container-product").length;
      i = 1;
    }
    if (i == null) {
      callback();
      return ;
    }
    async.whilst(
      function () { return countProductPage < limit; },
      function (callbackLoop) {
        var tabProductPage = options.$productPage(tabSearch[i])[countProductPage];
        logger("info", "loading product ["+(countProductPage+1)+"/"+limit+"]");
        options.urlProduct = "https://www.leroymerlin.fr" + options.$productPage(tabProductPage).find("a")[0].attribs.href;
        console.log(options.urlProduct);
        countProductPage ++;
        callbackLoop();
      },
      function (err) {
        callback();
      }
    );
  });
}

function crawlCategorie3(callback) {
  loadGenericPage(options.urlCategorie2, function($) {
    if (options.error) {
      logger("error", options.error);
      options.error = null;
      callback();
      return ;
    }
    options.$categorie3 = $;
    var limit = null;
    var i = null;
    var tabSearch = [
      "li.container",
      "div.product",
      "div.container-product"
    ];

    if (options.$categorie3("li.container").length > 0) {
      limit = options.$categorie3("li.container").length;
      i = 0;
    }
    else if (options.$categorie3("div.product").length > 0) {
      limit = options.$categorie3("div.product").length;
      i = 1;
    }
    else if (options.$categorie3("div.container-product").length > 0) {
      limit = options.$categorie3("div.container-product").length;
      i = 2;
    }
    if (i == null) {
      callback();
      return ;
    }
    async.whilst(
  		function () { return countCategorie3 < limit; },
  		function (callbackLoop) {
        var tabCategorie3 = options.$categorie3(tabSearch[i])[countCategorie3];
        logger("info", "loading Categorie 3 -- ["+(countCategorie3+1)+"/"+limit+"] -- " + options.$categorie3(tabCategorie3).find("h3").text().trim());
        options.urlCategorie3 = "https://www.leroymerlin.fr" + options.$categorie3(tabCategorie3).find("a")[0].attribs.href + "?resultLimit=1000";
        crawlProductPage(function() {
          countProductPage = 0;
          countCategorie3 ++;
          callbackLoop();
        });
  		},
  		function (err) {
        countCategorie3 = 0;
        callback();
  		}
  	);
  });
  return ;
}

function crawlCategorie2(callback) {
  var tabCategorie1 = options.$categorie1("li.linkHeader")[countCategorie1];
  options.urlCategorie1 = "https://www.leroymerlin.fr" + options.$categorie1(tabCategorie1).find("a")[0].attribs.href;
  loadGenericPage(options.urlCategorie1, function($) {
    if (options.error) {
      logger("error", options.error);
      options.error = null;
      callback();
      return ;
    }
    options.$categorie2 = $;
    var limit = options.$categorie2("li.container").length;
    async.whilst(
  		function () { return countCategorie2 < limit; },
  		function (callbackLoop) {
        var tabCat = options.$categorie2("li.container")[countCategorie2];
        logger("info", "loading Categorie 2 ---- ["+(countCategorie2+1)+"/"+limit+"] ---- " + options.$categorie2(tabCat).find("h3").text().trim());
        var string = options.$categorie2(tabCat).find("h3").text().trim();
        substring = "Livre";
        if (string.includes(substring)) {
          countCategorie2 ++;
          callbackLoop();
          return ;
        }
        options.urlCategorie2 = "https://www.leroymerlin.fr" + options.$categorie2(tabCat).find("a")[0].attribs.href;
        crawlCategorie3(function() {
          countCategorie3 = 0;
          countCategorie2 ++;
          callbackLoop();
        });
  		},
  		function (err) {
        countCategorie2 = 0;
        callback();
  		}
  	);
  });
  return ;
}

function crawlPages(callback) {
  var tabCategorie1 = options.$categorie1("li.linkHeader");
  async.whilst(
    function () { return countCategorie1 < 12; },
    function (callLoop) {
      logger("info", "loading Categorie 1 ------ ["+(countCategorie1+1)+"/12] ------ "+options.$categorie1(tabCategorie1[countCategorie1]).find("span.transparent-bloc-tab").text());
      crawlCategorie2(function () {
        countCategorie1 ++;
        callLoop();
      });
    },
    function (err) {
      callback();
      return ;
    }
  )
}

function crawlHomePage(callback) {
  request({
	    headers: {
				'Accept-Encoding': 'gzip, deflate, sdch, br',
		    'Accept-Language': 'en-US,en;q=0.8,fr;q=0.6,de;q=0.4',
		    'Upgrade-Insecure-Requests': '1',
		    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
		    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		    'Cache-Control': 'max-age=0',
		    'Connection': 'keep-alive'
	    },
			url: 'https://www.leroymerlin.fr/',
			'gzip': true,
	  }, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
				options.$categorie1 = cheerio.load(body);
				callback();
				return ;
			}
      else {
        logger("error", "Error detected while loading homePage. Please restart the crawler");
        options.error = "Error detected while loading homePage. Please restart the crawler";
        options.cb();
        return ;
      }
	  });
}

var crawl = function(cb)
{
	var jsonFile = null;
	if (process.argv.length < 3) {
		jsonFile = "leroymerlin_product.json";
	}
	else {
		jsonFile = process.argv[2] + ".json";
	}
  options.fileName = jsonFile;
  options.error = null;
  options.cb = cb;

	waterfall([
	  function(callback){
			logger("info", "Home Page Loading");
			crawlHomePage(function() {
        logger("info", "Home Page Loaded");
        crawlPages(function() {
          callback();
  			});
			});
	  },
    function(callback){
			crawlPages(function() {
        callback();
        return ;
			});
	  }
	], function (err) {
		logger("info", "Crawler Done");
		options.cb();
    return ;
	});
};

exports.crawl = crawl;

crawl(function (e)
{
	console.log("--------------------------Crawler Done-----------------------------");
});
