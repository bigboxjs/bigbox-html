/**
 * Created by jiehua.yang on 2014/9/3.
 */

var FSUtil = require("fs");
var PathUtil = require("path");
var HTMLParser = require("htmlparser");

/**
 * 处理路径下所有的文件，把html转换成对应的js文件
 * @param path
 */
exports.deal = function(path) {
	searchDir(path);
};

/**
 * 转化制定的路径的文件
 * @param path
 * @returns {*}
 */
exports.translate = function(path) {
	return toJSON(path);
};

/**
 * 渲染结果
 * @param template
 * @returns {string}
 */
exports.render = function(template) {
	return template;
};

/**
 * 搜索该文件下的所有文件
 * @param dir
 */
function searchDir(dir) {
	var paths = FSUtil.readdirSync(dir);
	paths.forEach(function(path) {
		switch (PathUtil.extname(path).toLowerCase()) {
			case "":
				// 这是文件夹
				searchDir(PathUtil.join(dir, path, "/"));
				break;
			case ".html":
				// 这是文件
				toJSON(PathUtil.join(dir, path));
				break;
		}
	});
}

/**
 * 把指定路径的文件转化为json
 * @param path
 */
function toJSON(path) {
	// 读取文件内容
	var buffer = FSUtil.readFileSync(path);
	var html = buffer.toString();

	// 得到对应的json格式内容
	var json = {
		head: parseHead(html),
		body: parseBody(html)
	};

	// 写入到新文件中
	FSUtil.writeFileSync(path + ".js", "module.exports = " + JSON.stringify(json) + ";", {
		flag: "w"
	});

	return json;
}

/**
 * 解析head内容
 * @param html
 * @returns {{title: string, resources: Array}}
 */
function parseHead(html) {
	var title = "";
	var resources = [];

	// 先获得head部分的字符串
	var start = html.indexOf(">", html.indexOf("<head")) + 1;
	var end = html.indexOf("</head>", start);
	var headHTML = html.substring(start, end);

	// 解析其中的内容
	var handler = new HTMLParser.DefaultHandler(function(error, doms) {
		doms.forEach(function(dom) {
			switch (dom.name) {
				// 如果是title节点
				case "title":
					title = dom.children[0].data;
					break;

				// 如果是script节点
				case "script":
					// 判断是不是外链节点
					if (!!dom.attribs && typeof dom.attribs.src == "string") {
						// 这是外链节点
						resources.push({
							type: "js",
							src: dom.attribs.src
						});
					} else {
						// 这是内联节点
						resources.push({
							type: "js",
							text: dom.children[0].data
						});
					}
					break;

				// 如果是link节点
				case "link":
					if (!!dom.attribs && dom.attribs.rel == "stylesheet"
						&& typeof dom.attribs.href == "string") {
						resources.push({
							type: "css",
							href: dom.attribs.href
						});
					}
					break;

				// 如果是style节点
				case "style":
					// 这是内联节点
					resources.push({
						type: "css",
						text: dom.children[0].data
					});
					break;
			}
		});
	});
	var parser = new HTMLParser.Parser(handler);
	parser.parseComplete(headHTML);

	return {
		title: title,
		resources: resources
	};
}

/**
 * 解析body内容
 * @param html
 * @returns {{prefix: string, postfix: string}|{content: string}}
 */
function parseBody(html) {
	var prefix = "";
	var postfix = "";
	var content = "";

	// 先获得body部分的字符串
	var start = html.indexOf(">", html.indexOf("<body")) + 1;
	var end = html.indexOf("</body>", start);
	var bodyHTML = html.substring(start, end);

	// 分析内容
	var containerHTML = '<link rel="import" name="DedoCtr" />';
	var index = bodyHTML.indexOf(containerHTML);
	if (index == -1) {
		// 这是叶子节点，不能再嵌套别的内容了
		return {
			content: bodyHTML
		};
	} else {
		// 这是个容器节点
		return {
			prefix: bodyHTML.substring(0, index),
			postfix: bodyHTML.substring(index + containerHTML.length)
		};
	}

}