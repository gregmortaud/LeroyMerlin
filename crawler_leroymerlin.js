var cheerio = require("cheerio");
var request = require("request");
var async = require("async");
var waterfall = require('async-waterfall');

var logger = function (level, message)
{
	level = (level || "") + "";
	message = (message || "") + "";

	console.log('{"level":"' + level.toUpperCase() + '", "site": "Leroy Merlin", "message": "' + message + '"}');
};


function loadFinalProduit(result, callback) {
	logger("info", "Product Page loading");
	request("https://www.leroymerlin.fr" + result.urlEachProduit, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result.bodyFinalProduct = cheerio.load(body);
			result.productObject.name = result.bodyFinalProduct("header [itemprop='name']").text();
			result.productObject.price = result.bodyFinalProduct("aside.price-container p.price").text();
			//result.productObject.information = result.bodyFinalProduct("[itemprop='description']").text().trim();
			logger("info", "Product Page "+ (result.limitEachProduit +1) + "/" + result.limitDetailProduits);
			result.crawlResult.push(result.productObject);
			// console.log("Name Product:");
			// console.log(result.nameProduct);
			// console.log("Price Product:");
			// console.log(result.priceProduct);
			// console.log("Detail Product:");
			// console.log(result.detailProduct);
			// console.log("------" + (result.limitEachProduit +1) + "/" + result.limitDetailProduits +"-------------- Produit suivants ----->>>>>>>>");
			// console.log(result.bodyFinalProduct("[itemprop='description']").text().trim());
			// result.limitProduits = result.bodyDetailProduits("[itemtype='http://schema.org/Product']").length;
			callback(result);
			return ;
		}
		else {
			logger("error", "loadFinalProduit failed");
			result.error = "loadFinalProduit failed";
			result.cb(result);
			return ;
		}
	});
};

function loadEachProduits(result, callback) {
	var limit = result.limitDetailProduits;
	var count = 0;
	async.whilst(
		function () { return count < limit; },
		function (callback) {
			result.limitEachProduit = count;
			result.urlEachProduit = result.bodyDetailProduits("[itemtype='http://schema.org/Product'] h3 a")[count].attribs.href;
			loadFinalProduit(result, function(result) {
				count++;
				callback();
			});
		},
		function (err) {
			if (err) {
				logger("error", "loadEachProduits failed");
				result.error = "loadEachProduits failed";
				result.cb(result);
				return ;
			}
			else {
				callback();
				return ;
			}
		}
	);
};

function loadDetailProduitsPage(result, callback) {
	request("https://www.leroymerlin.fr" + result.urlProduitsPage, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result.bodyDetailProduits = cheerio.load(body);
			result.limitDetailProduits = result.bodyDetailProduits("[itemtype='http://schema.org/Product']").length;
			callback(result);
			return ;
		}
		else {
			logger("error", "loadProduitsPage failed");
			result.error = "loadProduitsPage failed";
			result.cb(result);
			return ;
		}
	});
};

function findCategorie3(result, callback) {
	var limit = result.limitProduits;
	var count = 0;
	async.whilst(
		function () { return count < limit; },
		function (callback) {
			result.urlProduitsPage = result.bodyProduits("div.sidebar li a")[count].attribs.href;
			// console.log(result.bodyProduits("div.sidebar li a")[count].attribs.href);
			// console.log(result.bodyProduits("div.sidebar li a")[count].children[0].data);
			// console.log("------------------------------------------");
			// console.log(result.crawlResult);
			logger("info", "loading Categorie3 - "+(count+1)+"/"+limit+" - "+result.bodyProduits("div.sidebar li a")[count].children[0].data);
			result.productObject.categorie3 = result.bodyProduits("div.sidebar li a")[count].children[0].data;
			// console.log(result.bodyAcceuil(result.bodyProduits).find("div.sidebar li"));
			// console.log("-------------------NEW Product Page loading-------------------");
			loadDetailProduitsPage(result, function(result) {
				loadEachProduits(result, function(result) {
					count++;
					callback();
				});
			});
		},
		function (err) {
			if (err) {
				logger("error", "findCategorie3 failed");
				result.error = "findCategorie3 failed";
				result.cb(result);
				return ;
			}
		}
	);
};

function loadProduitsPage(result, callback) {
	request("https://www.leroymerlin.fr" + result.urlUnderUnderCat, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result.bodyProduits = cheerio.load(body);
			// console.log(result.bodyProduits("div.sidebar li").length);
			result.limitProduits = result.bodyProduits("div.sidebar li").length;
			callback(result);
			return ;
		}
		else {
			logger("error", "loadProduitsPage failed");
			result.error = "loadProduitsPage failed";
			result.cb(result);
			return ;
		}
	});
};

function findCategorie2(result, callback) {
	var count = 0;
	var limit = result.bodyAcceuil(result.underCategorie).find("ul.sousColonne > li").length;
	async.whilst(
	  function () { return count < limit; },
	  function (callback) {
			// console.log(result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].attribs.href);
			logger("info", "loading Categorie2 - "+(count+1)+"/"+limit+" - "+result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].children[0].data);
			result.urlUnderUnderCat = result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].attribs.href;
			result.productObject.categorie2 = result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].children[0].data;
			// console.log(result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].children[0].data);
			// console.log("---------------- hello- ------------------");
			loadProduitsPage(result, function(result) {
				findCategorie3(result, function(result) {
					count++;
					callback();
				});
			});
	  },
	  function (err) {
			return ;
	  }
	);
};


function findCategorie1(result, callback) {
	var count = 0;
	var tabLi = result.bodyAcceuil("li.linkHeader");
	async.whilst(
	  function () { return count < 13; },
	  function (cb) {
			// console.log(result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text());
			logger("info", "loading Categorie1 - "+(count+1)+"/13 - "+result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text());
			result.productObject.categorie1 = result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text();
			result.underCategorie = result.bodyAcceuil(tabLi[count]);
			findCategorie2(result, function(result) {
				count++;
				cb();
			});
	  },
	  function (err) {
      callback(result);
			return ;
	  }
	);
};

function loadPage(searchLinkUrl, result, callback) {
	logger("info", "Connection to Leroy Merlin HomePage");
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
				result.bodyAcceuil = cheerio.load(body);
				callback(result);
				return ;
			}
	  });
};

var crawl = function(searchLinkUrl, cb)
{
	var jsonFile = null;
	if (process.argv.length < 3) {
		jsonFile = "leroymerlin.json";
	}
	else {
		jsonFile = process.argv[2] + ".json";
	}
	var productObject = {
		name: null,
		price: null,
		information: null,
		categorie1: null,
		categorie2: null,
		categorie3: null
	};
	var result = {
		fileName: jsonFile,
		error: null,
		siteName: 'LeroyMerlin',
		cb: cb,
		bodyAcceuil: null,
		underCategorie: null,
		urlUnderUnderCat: null,
		underUnderCatBody: null,
		urlProduitsPage: null,
		crawlResult: [],
		productObject: productObject
	};

	waterfall([
	  function(callback){
			logger("info", "Crawling HomePage Starting");
			loadPage(searchLinkUrl, result, function(result) {
				if (result.error != null) {
					logger("error", "Crawler HomePage failed");
					cb(result);
					return ;
				}
				else {
					logger("info", "Done");
					callback(null, result);
				}
			});
	  },
	  function(result, callback){
			logger("info", "Crawler findCategorie1 starting");
			findCategorie1(result, function(result) {
				if (result.error != null) {
					logger("error", "Crawler findCategorie1 failed");
					cb(result);
					return ;
				}
				else {
					logger("info", "Done");
					callback(null, result);
				}
			});
	  }
	], function (err, result) {
		logger("info", "Crawler Done");
		cb(result);
	});
};

exports.crawl = crawl;

crawl({
	"url": "https://www.leroymerlin.fr/"


}, function (e)
{
	console.log("-----------------------------------------------------");
	console.log(JSON.stringify(e));
});
