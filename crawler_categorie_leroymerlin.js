var cheerio = require("cheerio");
var request = require("request");
var async = require("async");
var waterfall = require('async-waterfall');
var fs = require("fs");

var logger = function (level, message)
{
	level = (level || "") + "";
	message = (message || "") + "";

	console.log('{"level":"' + level.toUpperCase() + '", "site": "Leroy Merlin", "message": "' + message + '"}');
};

function findCategorie3(result, callback) {
	var limit = result.limitProduits;
	var count = 0;
	async.whilst(
		function () { return count < limit; },
		function (callbackLoop) {
      result.productObject.category = result.bodyProduits(result.bodyProduits("section.centerContent li.container")[count]).find("h3").text().trim();
      result.productObject.image = result.bodyProduits("section.centerContent li.container img")[count].attribs['data-src'];
      result.crawlResult.push({
        parent_category: result.categorie2,
        category: result.productObject.category,
				image: result.productObject.image
			});
      count++
      callbackLoop();
		},
		function (err) {
			if (err) {
				logger("error", "findCategorie3 failed");
				result.error = "findCategorie3 failed";
				result.cb(result);
				return ;
			}
			else {
				callback(result);
			}
		}
	);
};

function loadProduitsPage(result, callback) {
	request("https://www.leroymerlin.fr" + result.urlUnderUnderCat, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result.bodyProduits = cheerio.load(body);
			result.limitProduits = result.bodyProduits("section.centerContent li.container").length;
			callback(result);
			return ;
		}
    else if (error == null && response.statusCode == 500) {
      result.error = 500;
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

function loadCategorie2(result, callback) {
	request("https://www.leroymerlin.fr" + result.urlToRequest, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			result.bodyCategorie2 = cheerio.load(body);
			result.limitCategorie2 = result.bodyCategorie2("section.centerContent li.container").length;
			callback(result);
			return ;
		}
    else if (error == null && response.statusCode == 500) {
      result.error = 500;
      callback(result);
      return ;
    }
		else {
			logger("error", "loadCategorie2 failed");
			result.error = "loadCategorie2 failed";
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
	  function (callbackLoop) {
			logger("info", "loading Categorie2 - "+(count+1)+"/"+limit+" - "+result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].children[0].data);
			result.urlUnderUnderCat = result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].attribs.href;
			loadCategorie2(result, function(result) {
				result.productObject.category = result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[count].children[0].data;
				if (result.error == 500) {
					logger("error", "Page "+result.productObject.category+" failed");
					result.error = null;
					count++;
					callbackLoop();
					return ;
				}
				result.categorie2 = result.productObject.category;
				result.productObject.imageCategorie2 = result.bodyCategorie2("section.centerContent li.container img")[count].attribs['data-src'];
				result.crawlResult.push({
	        parent_category: result.categorie1,
	        category: result.productObject.category,
					image: result.productObject.imageCategorie2
				});
				loadProduitsPage(result, function(result) {
	        if (result.error == 500) {
	          logger("error", "Page "+result.productObject.category+" failed");
	          result.error = null;
	          count++;
	          callbackLoop();
	          return ;
	        }
					findCategorie3(result, function(result) {
						count++;
						callbackLoop();
					});
				});
			});
	  },
	  function (err) {
			if (err) {
				logger("error", "findCategorie2 failed");
				result.error = "findCategorie2 failed";
				result.cb(result);
				return ;
			}
			else {
				callback(result);
			}
	  }
	);
};

function findCategorie1(result, callback) {
	var count = 0;
	var tabLi = result.bodyAcceuil("li.linkHeader");
	async.whilst(
	  function () { return count < 12; },
	  function (callbackLoop) {
			logger("info", "loading Categorie1 - ["+(count+1)+"/12] - "+result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text());
      result.productObject.parent_category = null;
      result.categorie1 = result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text();
      result.productObject.category = result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text();
			result.underCategorie = result.bodyAcceuil(tabLi[count]);
      result.crawlResult.push({
        parent_category: null,
        category: result.productObject.category,
        image: null
      });
			result.urlToRequest = result.bodyAcceuil("div.onglet-content a")[count].attribs.href;
			findCategorie2(result, function(result) {
				count++;
				callbackLoop();
			});
	  },
	  function (err) {
			if (err) {
				result.error = "Error Categorie1";
				result.cb(result);
			}
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


function writeFileFunction(result, callback) {
  var string = JSON.stringify(result.crawlResult);
  fs.writeFile(result.fileName, string, (err) => {
    if (err) {
      result.error = "Error file not saved";
      callback(result);
      return ;
    }
    console.log('The file '+result.fileName+' has been saved! Enjoy ;)');
    callback(result);
  });
  return ;
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
    categorie1: null,
    categorie2: null,
    categorie3: null,
		crawlResult: [],
		productObject: {
      parent_category: null,
      category: null,
			image: null
		}
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
	  },
    function(result, callback){
			logger("info", "Writing JSON file");
			writeFileFunction(result, function(result) {
				if (result.error != null) {
					logger("error", "Writing JSON file");
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
});
