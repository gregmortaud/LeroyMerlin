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

var nbProduit = 2;
var resultSave = null;

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
		console.log("nbProduct done: " + resultSave.productObject.counter);
		writeFileFunction(resultSave, function(result) {
			process.exit(1);
		});
});

function loadFinalProduit(result, callback) {
	var isLoaded = false;
	var numberOfWhile = 0;

	setTimeout(function() {
		async.whilst(
			function () { return isLoaded == false; },
			function (callbackIsLoaded) {
				request("https://www.leroymerlin.fr" + result.urlEachProduit, function (error, response, body) {
					if (error || response.statusCode != 200) {!
						numberOfWhile ++;
						if (numberOfWhile == 1) {
							logger("INFO", "request reloading...");
							callbackIsLoaded();
							return ;
						}
						if (numberOfWhile > 50) {
							logger("error", "---- Product Page failed to Request ----");
							result.error = "Product Page failed to request";
							//result.cb(result);
							callback(result);
							return ;
						}
						callbackIsLoaded();
						return ;

					}
					else {
						isLoaded = true;
						logger("info", "Product Page "+ (result.limitEachProduit +1) + "/" + result.limitDetailProduits);
						var name = null;
						var price = null;
						var reference = null;
						var score = null;
						var description = null;
						var descriptionTechnique = null;
						var lot = null;//a faire
						var downloadLink = null;
						var imgObject = [];
						var productComp = [];
						var categorieParent = result.productObject.categorieParent;
						result.bodyFinalProduct = cheerio.load(body);

						name = result.bodyFinalProduct("header [itemprop='name']").text().trim();
						try {
							if (result.bodyFinalProduct("div.header-objet-connecte-description p.price strong").text() == "")
								price = result.bodyFinalProduct("div.price-wrapper p.price strong")[0].children[0].data;
							else
								price = result.bodyFinalProduct("div.header-objet-connecte-description p.price strong").text();
						} catch (e) {
							price = null;
						}
						reference = result.bodyFinalProduct("#global-reflm").text().trim();
						var regexp = /Réf([\n-a-zA-Z0-9-:_.]+)/ig;
						var exp = regexp.exec(reference);
						if (exp) {
							reference = exp[1].trim();
						}
						else {
							logger("info", "Reference not found");
							reference = null;
						}
						if (!result.bodyFinalProduct("p.reviews-synthesis-score strong") || !result.bodyFinalProduct("p.reviews-synthesis-score strong")[0] || !result.bodyFinalProduct("p.reviews-synthesis-score strong")[0].children[0]) {
							score = null;
							logger("info", "Score not available");
						}
						else
							score = result.bodyFinalProduct("p.reviews-synthesis-score strong")[0].children[0].data;
						description = result.bodyFinalProduct("div.header-objet-connecte-description p.description").text().trim();
						descriptionTechnique = result.bodyFinalProduct("section.objet-connecte-caracteristiques-techniques div.caracteristiques-techniques-liste").text().trim();
						descriptionTechnique = descriptionTechnique.replace(/  /g,"");
						descriptionTechnique = descriptionTechnique.replace(/\n/g,":");
						descriptionTechnique = descriptionTechnique.replace(/:::/g,"\n");
						for (var i = 0; i < result.bodyFinalProduct("div.content-carousel a").length; i++) {
							result.productObject["img_"+i] = result.bodyFinalProduct("div.content-carousel a")[i].attribs['data-zoom-image'];
							imgObject.push({
								["img_"+i]: result.bodyFinalProduct("div.content-carousel a")[i].attribs['data-zoom-image']
							});
						}
						for (var i = 0; i < result.bodyFinalProduct("section.push-complementaire").length; i++) {
							result.productObject["productComp_"+i] = "https://www.leroymerlin.fr" + result.bodyFinalProduct("section.push-complementaire h3 a")[i].attribs.href;
							productComp.push({
								["productComp_"+i]: "https://www.leroymerlin.fr" + result.bodyFinalProduct("section.push-complementaire h3 a")[i].attribs.href
							});
						}
						if (!result.bodyFinalProduct("div.download-content a")[0])
							logger("info", "Product Page: downloadLink not available");
						else
							downloadLink = result.bodyFinalProduct("div.download-content a")[0].attribs.href;
						result.productObject.counter ++;
						result.crawlResult.push({name, price, reference, categorieParent,
							score, description, descriptionTechnique, lot, downloadLink, imgObject, productComp});//ne pas oublier rajouter descriptionTechnique

							callbackIsLoaded();
							return ;
					}
				});
			},
			function () {
				callback(result);
				return ;
			}
		);
	}, 1000);
















	// request("https://www.leroymerlin.fr" + result.urlEachProduit, function (error, response, body) {
	// 	if (!error && response.statusCode == 200) {
	// 		logger("info", "Product Page "+ (result.limitEachProduit +1) + "/" + result.limitDetailProduits);
	// 		var name = null;
	// 		var price = null;
	// 		var reference = null;
	// 		var score = null;
	// 		var description = null;
	// 		var descriptionTechnique = null;
	// 		var lot = null;//a faire
	// 		var downloadLink = null;
	// 		var imgObject = [];
	// 		var productComp = [];
	// 		var categorieParent = result.productObject.categorieParent;
	// 		result.bodyFinalProduct = cheerio.load(body);
	//
	// 		name = result.bodyFinalProduct("header [itemprop='name']").text().trim();
	// 		if (result.bodyFinalProduct("div.header-objet-connecte-description p.price strong").text() == "")
	// 			price = result.bodyFinalProduct("div.price-wrapper p.price strong")[0].children[0].data;
	// 		else
	// 			price = result.bodyFinalProduct("div.header-objet-connecte-description p.price strong").text();
	// 		reference = result.bodyFinalProduct("#global-reflm").text().trim();
	// 		var regexp = /Réf([\n-a-zA-Z0-9-:_.]+)/ig;
	// 		var exp = regexp.exec(reference);
	// 		if (exp) {
	// 			reference = exp[1].trim();
	// 		}
	// 		else {
	// 			logger("info", "Reference not found");
	// 			reference = null;
	// 		}
	//
	// 		if (!result.bodyFinalProduct("p.reviews-synthesis-score strong")[0].children[0]) {
	// 			score = null;
	// 			logger("info", "Score not available");
	// 		}
	// 		else
	// 			score = result.bodyFinalProduct("p.reviews-synthesis-score strong")[0].children[0].data;
	// 		description = result.bodyFinalProduct("div.header-objet-connecte-description p.description").text().trim();
	// 		descriptionTechnique = result.bodyFinalProduct("section.objet-connecte-caracteristiques-techniques div.caracteristiques-techniques-liste").text().trim();
	// 		for (var i = 0; i < result.bodyFinalProduct("div.content-carousel a").length; i++) {
	// 			result.productObject["img_"+i] = result.bodyFinalProduct("div.content-carousel a")[i].attribs['data-zoom-image'];
	// 			imgObject.push({
	// 				["img_"+i]: result.bodyFinalProduct("div.content-carousel a")[i].attribs['data-zoom-image']
	// 			});
	// 		}
	// 		for (var i = 0; i < result.bodyFinalProduct("section.push-complementaire").length; i++) {
	// 			result.productObject["productComp_"+i] = "https://www.leroymerlin.fr" + result.bodyFinalProduct("section.push-complementaire h3 a")[i].attribs.href;
	// 			productComp.push({
	// 				["productComp_"+i]: "https://www.leroymerlin.fr" + result.bodyFinalProduct("section.push-complementaire h3 a")[i].attribs.href
	// 			});
	// 		}
	// 		if (!result.bodyFinalProduct("div.download-content a")[0])
	// 			logger("info", "Product Page: downloadLink not available");
	// 		else
	// 			downloadLink = result.bodyFinalProduct("div.download-content a")[0].attribs.href;
	// 		result.productObject.counter ++;
	// 		result.crawlResult.push({name, price, reference, categorieParent,
	// 			score, description, lot, downloadLink, imgObject, productComp});//ne pas oublier rajouter descriptionTechnique
	//
	// 		callback(result);
	// 		return ;
	// 	}
	// 	else {
	// 		logger("error", "---- Product Page failed to Request ----");
	// 		result.error = "Product Page failed to request";
	// 		result.cb(result);
	// 		return ;
	// 	}
	// });
};

function loadEachProduits(result, callback) {
	var limit = result.limitDetailProduits;
	var count = 0;
	async.whilst(
		function () { return count < limit; },//remettre limit
		function (callbackLoop) {
			try {
				result.limitEachProduit = count;
				result.urlEachProduit = result.bodyDetailProduits("[itemtype='http://schema.org/Product'] h3 a")[count].attribs.href;
			} catch (e) {
				console.log(result.urlProduitsPage);
				if (result.urlProduitsPage == "/v3/p/produits/terrasse-jardin/grillage-canisse-panneau-cloture-et-palissade/composez-votre-panneau-de-cloture-l1500636302"
				|| result.urlProduitsPage == "/v3/p/produits/decoration-eclairage/tringle-a-rideaux-barre-rail-et-cable/collections-de-tringles-a-rideaux-a-composer-l1401718868"
				|| result.urlProduitsPage == "/v3/p/produits/cuisine/meuble-de-cuisine/cuisine-personnalisable-delinia-l1401014932"
				|| result.urlProduitsPage == "/v3/p/services-l1401419633"
				|| result.urlProduitsPage == "/v3/p/produits/salle-de-bains/meuble-de-salle-de-bains-et-vasque/meuble-de-salle-de-bains-vue-inspiration-l1401395067"
				|| result.urlProduitsPage == "/v3/p/cuisine-sur-mesure-ingenious-l1401120364"//a partir d'en bas
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/isolation/isolation-des-combles-l1308218211"
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/isolation/isolation-des-sols-l1308218229"
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/cloison-et-plafond/plaque-de-platre-l1308217983"
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/cloison-et-plafond/ossature-metallique-pour-cloison-et-plafond-l1308217978"
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/cloison-et-plafond/carreau-de-platre-et-beton-cellulaire-l1308217929"
				|| result.urlProduitsPage == "/v3/p/produits/materiaux-menuiserie/toiture-charpente-et-bardage/bardage-et-clin-l1308218568"
				|| result.urlProduitsPage == "/v3/p/produits/decoration-eclairage/coussin-plaid-et-pouf/pouf-et-poire-l1308218663"
				|| result.urlProduitsPage == "/v3/p/produits/decoration-eclairage/papier-peint-frise-et-fibre-de-verre/echantillon-de-papier-peint-l1500664215") {
					count ++;
					logger("info", "Detection crawl impossible - url skiped");
					callbackLoop();
					return ;
				}
				if (result.bodyDetailProduits("[itemtype='http://schema.org/ItemList']")) {
					if (result.bodyDetailProduits("[itemtype='http://schema.org/ItemList'] a")[count]) {
						if (result.bodyDetailProduits("[itemtype='http://schema.org/ItemList'] a")[count].attribs) {
							result.urlEachProduit = result.bodyDetailProduits("[itemtype='http://schema.org/ItemList'] a")[count].attribs.href;
						}
					}
				}
			}
			loadFinalProduit(result, function(result) {
				if (result.error) {
					logger("info", "Url skiped detected");
					result.error = null;
				}
				count++;
				callbackLoop();
			});
		},
		function (err) {
			if (err) {
				logger("error", "loadEachProduits failed");
				result.error = "loadEachProduits failed";
				callback(result);
				//result.cb(result);
				return ;
			}
			else {
				callback(result);
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
			//result.cb(result);
			callback(result);
			return ;
		}
	});
};

function findCategorie3(result, callback) {
	var limit = result.limitProduits;
	var count = 0;
	async.whilst(
		function () { return count < limit; },
		function (callbackLoop) {
			result.urlProduitsPage = result.bodyProduits("div.sidebar li a")[count].attribs.href;
			// result.urlProduitsPage = result.bodyProduits("div.sidebar li a")[2].attribs.href;
			logger("info", "loading Categorie3 - "+(count+1)+"/"+limit+" - "+result.bodyProduits("div.sidebar li a")[count].children[0].data);
			result.productObject.categorieParent = result.bodyProduits("div.sidebar li a")[count].children[0].data;
			loadDetailProduitsPage(result, function(result) {
				if (result.error) {
					logger("error", "loadProduitsPage failed / skip");
					result.error = null;
					count ++;
					callbackLoop();
					return ;
				}
				loadEachProduits(result, function(result) {
					count ++;
					callbackLoop();
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
			result.limitProduits = result.bodyProduits("div.sidebar li").length;
			callback(result);
			return ;
		}
		else {
			logger("error", "loadProduitsPage failed");
			result.error = "loadProduitsPage failed";
			callback(result);
			//result.cb(result);
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
			// result.urlUnderUnderCat = result.bodyAcceuil(result.underCategorie[0]).find("ul.sousColonne > li > a")[3].attribs.href;
			loadProduitsPage(result, function(result) {
				if (result.error) {
					logger("error", "loadProduitsPage failed / skip");
					result.error = null;
					count ++;
					callbackLoop();
					return ;
				}
				findCategorie3(result, function(result) {
					count ++;
					callbackLoop();
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
	  function () { return count < 13; },
	  function (callbackLoop) {
			logger("info", "loading Categorie1 - "+(count+1)+"/13 - "+result.bodyAcceuil(tabLi[count]).find("span.transparent-bloc-tab").text());
			result.underCategorie = result.bodyAcceuil(tabLi[count]);
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
			counter: 0,
			information: null,
			categorie1: null,
			categorie2: null,
			categorie3: null,
			lot:null
		}
	};
	resultSave = result;
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
		console.log("produit crawler: " + result.productObject.counter);
		logger("info", "Crawler Done");
		cb(result);
	});
};

exports.crawl = crawl;

crawl({
	"url": "https://www.leroymerlin.fr/"


}, function (e)
{
	console.log("--------------------------Crawler Done-----------------------------");
	// console.log(e);
	// console.log(JSON.stringify(e));
});
