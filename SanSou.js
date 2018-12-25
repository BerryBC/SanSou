// .gitignore node_modules/*

//引入包
var url = require("url");                       //解析操作url
// var superagent = require("superagent");         //代理请求操作

var charset = require('superagent-charset');
var superagent = charset(require('superagent'));
var iconv = require('iconv-lite');


var cheerio = require("cheerio");               //解释HTML为DOM结构
var s5http = require("socks5-https-client");    //通过Socks5代理
var http = require("http");
var fs = require("fs");
var path = require("path");

//地址设定
// var strBingUrl = "http://global.bing.com/search?q=" + encodeURI(strSearchKeyWord) + "&first=" + intNowResultNumber;
// var strBaiduUrl = "http://www.baidu.com/s?ie=utf-8&wd=" + encodeURI(strSearchKeyWord) + "&pn=" + intNowResultNumber;
// var strGoogleUrl = "https://www.google.com.hk/search?safe=off&oe=utf-8&ie=utf-8&q=" + encodeURI(strSearchKeyWord) + "&start=" + intNowResultNumber;

//设定类
// var objSingleResultProto={   //结果元素
//     "HeadHTML":"",
//     "GoURL":"",
//     "ShowURL":"",
//     "Content":"",
//     "FromEngine":0
// };
// var objFinalResultProto={    //最终输出结果
//     "MaxResult":0,
//     "EveryResult":[objSingleResultProto],
//     "IsError": false,
//     "ErrorCode": ""

// };

//------------------------------------------------------

//设置搜索引擎
// aryEngine.push({
//     "Describe": "Baidu",                        //百度搜索设置
//     "URLFirst": "http://www.baidu.com/s?ie=utf-8&wd=",
//     "URLWhich": "&pn=",
//     "URLHowManyOneTime": "&rn=",
//     "MaxResultNumberClass": ".nums",
//     "EveryResultDivClass": ".result",
//     "HeadHTMLClass": ".t a",
//     "ShowURLClass": ".c-showurl",
//     "ContentClass": ".c-abstract",
//     "NeedSocks5": false,
//     "NumberOfEngine":0
// });
// aryEngine.push({
//     "Describe": "Bing",                         //必应搜索设置
//     "URLFirst": "http://global.bing.com/search?adlt=off&q=",
//     "URLWhich": "&first=",
//     "URLHowManyOneTime": "&count=",
//     "MaxResultNumberClass": ".sb_count",
//     "EveryResultDivClass": ".b_algo",
//     "HeadHTMLClass": "h2 a ",
//     "ShowURLClass": ".b_attribution cite",
//     "ContentClass": ".b_caption p",
//     "NeedSocks5": false,
//     "NumberOfEngine":1
// });
// aryEngine.push({
//     "Describe": "Google",                       //谷歌搜索设置
//     "URLFirst": "https://www.google.com.hk/search?safe=off&oe=utf-8&ie=utf-8&q=",
//     "URLWhich": "&start=",
//     "URLHowManyOneTime": "&num=",
//     "MaxResultNumberClass": ".sd",
//     "EveryResultDivClass": ".g",
//     "HeadHTMLClass": ".r a",
//     "ShowURLClass": "cite",
//     "ContentClass": ".st",
//     "NeedSocks5": true,
//     "NumberOfEngine":2
// });


//初始化内容
var aryEngine = [];
var intMaxEngine = 0;                           //搜索引擎数
var GSocksHost = "";
var GSocksPort = 0;
var RequestNumOfOneTime = 0;
var ListenPort = 0;
var objJSONConfig;
var strPaperURL = "";
var strLogPath = "";
var strLogFileName = "";



fs.readFile('G:\\Programme\\Working\\NodeJS\\Working\\SanSou\\ServerConfig.JSON', function (err, data) {
	if (err) throw err;
	HaveThePaper();
	objJSONConfig = JSON.parse(data);
	objJSONConfig.ServerConfig.forEach(function (eleConfig) {
		aryEngine.push(eleConfig);
	}, this);
	ListenPort = objJSONConfig.ListenPort;
	intMaxEngine = aryEngine.length;                           //搜索引擎数
	GSocksHost = objJSONConfig.GSocksHost;
	GSocksPort = objJSONConfig.GSocksPort;
	RequestNumOfOneTime = objJSONConfig.RequestNumOfOneTime;


	var httpSearchServer = http.createServer(function (req, res) {
		var strGetURL = url.parse(req.url).pathname;
		//分辨不同的请求
		if (strGetURL == "/search") {
			SearchMainFunction(req, res);
		} else if (strGetURL == "/loadconfig") {
			PostTheConfig(req, res);
		} else if (strGetURL == "/loadbgp") {
			PostTheBGPaper(req, res);
		} else if (strGetURL == "/loadbdsug") {
			GetBaiduSugServer(req, res);
		};
	});

	httpSearchServer.listen(ListenPort);
	console.log("Search Engine was just ran on port " + ListenPort);
	setTimeout(function () {
		HaveThePaper();
	}, 21600000);
});




function SearchMainFunction(hsReq, hsRes) {
	hsRes.writeHeader(200, { "Content-Type": "text/plain", "charset": "UTF-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET" });

	//配置反馈信息

	//配置最终输出结果
	var objFinalResult = {    //最终输出结果
		"MaxResult": 0,
		"EveryResult": [],
		"IsError": false,
		"ErrorCode": ""
	};
	var objIsFinsh = [];
	var dateBeginTime = new Date();
	var strSearchKeyWord = "";
	var intNowResultNumber = "";
	var strSearchEngine = "";
	var bolIsSearched = false;


	//查询信息
	var SearchArg = url.parse(hsReq.url, true).query;


	if (!SearchArg.kw || !SearchArg.pg || !SearchArg.se) {
		IsError("无查找关键字");
		DoWhatItDone();
		return 0;
	};

	//设置搜索信息
	strSearchKeyWord = SearchArg.kw;
	intNowResultNumber = SearchArg.pg;
	strSearchEngine = SearchArg.se;

	//主程序



	aryEngine.forEach(function (element) {
		if (element.Describe == strSearchEngine) {
			var strTargetURL = element.URLFirst + encodeURI(strSearchKeyWord) + element.URLWhich + (intNowResultNumber * RequestNumOfOneTime) + element.URLHowManyOneTime + RequestNumOfOneTime;
			SendRequestToEngine(strTargetURL, element);
			bolIsSearched = true;
		};
	}, this);
	if (!bolIsSearched) {
		IsError("无匹配搜索引擎");
		DoWhatItDone();
		return 0;

	};

	//请求浏览器结果函数
	function SendRequestToEngine(RtargetURL, DoSearchConfig) {
		if (!DoSearchConfig.NeedSocks5) {
			superagent.get(RtargetURL).end(function (err, res) {
				if (err) {
					IsError(err);
					// objIsFinsh.push(DoSearchConfig.Describe);
					return 0;
				}
				else {
					HandlePage(res.text, RtargetURL, DoSearchConfig);
				};
			});
		}
		else {
			var Socks5Options = url.parse(RtargetURL);
			Socks5Options.socksPort = GSocksPort;
			Socks5Options.socksHost = GSocksHost;
			var req = s5http.get(Socks5Options, function (res) {
				var size = 0;
				var chunks = [];
				res.on('data', function (chunk) {
					size += chunk.length;
					chunks.push(chunk);
				});
				res.on('end', function () {
					var data = Buffer.concat(chunks, size);
					HandlePage(data, RtargetURL, DoSearchConfig);
				});
			}).on('error', function (err) {
				IsError(err);
			});
			req.end();
		};
	};

	//处理查找结果函数
	function HandlePage(DataOfPage, RtargetURLInHandle, DoSearchConfigInHandle) {
		var bolIsDone = true;
		var $ = cheerio.load(DataOfPage);
		var $objResultDIVS, $objResultDIV, $objResultHead, $objShowURLContent, $objResultContent;
		//找查结果数
		if (bolIsDone && $(DoSearchConfigInHandle.MaxResultNumberClass).length > 0) {
			var AllResultCount = $($(DoSearchConfigInHandle.MaxResultNumberClass).get(0)).text();
			AllResultCount = AllResultCount.match(/([0-9]{1,3}(,[0-9]{3})*)/g);
			AllResultCount = GetMaxFromStringArray(AllResultCount);
			if (objFinalResult.MaxResult < AllResultCount) { objFinalResult.MaxResult = AllResultCount };
		}
		else {
			bolIsDone = false;
		};
		//获取查询结果DIV
		$objResultDIVS = $(DoSearchConfigInHandle.EveryResultDivClass);
		if (bolIsDone && $objResultDIVS.length == 0) { bolIsDone = false };
		$objResultDIVS.each(function (idx, element) {
			var objTmpResult = {};
			var bolIsDoneInside = true;
			//读取本DIV到Cheerio
			$objResultDIV = cheerio.load($(element).html());
			//读取标题框
			$objResultHead = $objResultDIV(DoSearchConfigInHandle.HeadHTMLClass);
			if (bolIsDone && bolIsDoneInside && $objResultHead.length > 0) {
				objTmpResult.HeadHTML = $objResultDIV($objResultHead.get(0)).html();
				objTmpResult.GoURL = url.resolve(RtargetURLInHandle, $objResultHead.get(0).attribs.href).toString();
			}
			else {
				bolIsDoneInside = false;
			};
			//读取显示的URL框
			$objShowURLContent = $objResultDIV(DoSearchConfigInHandle.ShowURLClass);
			if (bolIsDone && bolIsDoneInside && $objShowURLContent.length > 0) {
				objTmpResult.ShowURL = $objResultDIV($objShowURLContent.get(0)).html();
			}
			else {
				bolIsDoneInside = false;
			};
			//读取预览内容框
			$objResultContent = $objResultDIV(DoSearchConfigInHandle.ContentClass);
			if (bolIsDone && bolIsDoneInside && $objResultContent.length > 0) {
				objTmpResult.Content = $objResultDIV($objResultContent.get(0)).html();
			}
			else {
				bolIsDoneInside = false;
			};
			//处理完毕插入列队
			if (bolIsDoneInside) {
				objTmpResult.FromEngine = DoSearchConfigInHandle.NumberOfEngine;
				objFinalResult.EveryResult.push(objTmpResult);
			};

		});
		DoWhatItDone();
	};

	//按照字符数组求出最大数值
	function GetMaxFromStringArray(ArrayOfNumber) {
		var nowMax = 0;
		if (ArrayOfNumber) {
			ArrayOfNumber.forEach(function (element) {

				var nowStrNumber = element.replace(/,/g, "")
				var nowNum = parseInt(nowStrNumber);
				nowMax = nowNum > nowMax ? nowNum : nowMax;
			}, this);
			return nowMax
		}
		else { return 0 };
	};

	//当完成了的时候的处理
	function DoWhatItDone() {
		var dateEndTime = new Date();
		console.log("--------------------------------");
		console.log("Search key word is : " + strSearchKeyWord + " ,正在搜索 " + intNowResultNumber + " 页");
		console.log("Use engine is :" + strSearchEngine);
		console.log("搜索结果为 " + objFinalResult.EveryResult.length + " 条，其中总共符合搜索引擎查询条数为 " + objFinalResult.MaxResult + "条");
		console.log("其中错误为 " + objFinalResult.IsError + " ，错误代码为 " + objFinalResult.ErrorCode)
		console.log("处理花费了 " + (dateEndTime - dateBeginTime) + " 毫秒的时间");
		console.log("Now Time Is : " + dateEndTime)

		hsRes.write(JSON.stringify(objFinalResult));
		hsRes.end();

	};

	//查看是否错误
	function IsError(err) {
		if (objFinalResult.EveryResult.length == 0) {
			objFinalResult.IsError = true;
			objFinalResult.ErrorCode = err.toString();
			if (err.response) {
				if (err.response.res) {
					objFinalResult.ErrorCode = err.response.res.statusCode.toString();
				};
			};
		}
		else {
			objFinalResult.IsError = false;
			objFinalResult.ErrorCode = "";
		};
	};
};

function PostTheConfig(hsReq, hsRes) {
	hsRes.writeHeader(200, { "Content-Type": "text/plain", "charset": "UTF-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET" });
	var objPostConfig = { "arrSearchEngine": [] };
	for (var intForEngineConfig = 0; intForEngineConfig < objJSONConfig.ServerConfig.length; intForEngineConfig++) {
		var objTmpConfig = {};
		objTmpConfig.SEName = objJSONConfig.ServerConfig[intForEngineConfig].Describe;
		objTmpConfig.RealURLPara = objJSONConfig.ServerConfig[intForEngineConfig].RealURLPara;
		objPostConfig.arrSearchEngine.push(objTmpConfig);
	};
	hsRes.write(JSON.stringify(objPostConfig));
	hsRes.end();
};


function HaveThePaper() {
	superagent.get("http://www.bing.com/").end(function (err, res) {
		if (err) {
			return 0;
		}
		else {
			var regBGP = new RegExp(/g_img=\{url:\s*\"([\W|\S]*)\",id/, "gm");
			var $ = cheerio.load(res.text);
			var strBingHTML = $.html();
			strBingHTML.match(regBGP);
			strPaperURL = RegExp.$1;
			if (strPaperURL.substr(0, 4) != "http") { strPaperURL = "http://www.bing.com" + strPaperURL };
		};
	});
	setTimeout(function () {
		HaveThePaper();
	}, 21600000);

};


function PostTheBGPaper(hsReq, hsRes) {
	hsRes.writeHeader(200, { "Content-Type": "text/plain", "charset": "UTF-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET" });
	var objPostConfig = { "strBPGURL": strPaperURL };

	hsRes.write(JSON.stringify(objPostConfig));
	hsRes.end();
};


function LoadSearchLog(hsReq, hsRes) {
	//---------------
	//strLogPath="";
	//strLogFileName="";    --这两个需要写进配置JSON

};


function GetBaiduSugServer(hsReq, hsRes) {
	hsRes.writeHeader(200, { "Content-Type": "text/plain;charset:utf-8", "charset": "UTF-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,GET" });

	var SearchArg = url.parse(hsReq.url, true).query;
	superagent.get("http://suggestion.baidu.com/su?json=1&p=3&wd=" + encodeURI(SearchArg.kw)).charset("gbk").end(function (err, res) {
		if (err) {
			return 0;
		}
		else {

			// var buf = iconv.encode(res.text, 'utf-8');
			// var qq = iconv.decode(buf, 'utf-8');

			var jsonOrgGet = JSON.parse(res.text.substring(17, res.text.length - 2).replace(/\\/g, ""));
			var jsonTranWrite = {};
			jsonTranWrite.s = jsonOrgGet.s;

			hsRes.write(JSON.stringify(jsonTranWrite));
			hsRes.end();
		};
	});
	return 0;
};