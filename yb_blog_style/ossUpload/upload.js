
accessid= '';
accesskey= '';
host = '';
// 签名用到的变量，改为隐藏keyId/keySecret方式
policyBase64 = '';
signature = '';

var ossPropFileName = "OSS-properties.json";
g_dirname = ''; // 文件夹路径
g_object_name = ''; // 文件名
g_object_name_type = ''; // 文件名命名类型分local_name或random_name
now = timestamp = Date.parse(new Date()) / 1000; 

var policyText = {
    "expiration": "2050-01-01T12:00:00.000Z", //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了
    "conditions": [
    ["content-length-range", 0, 1048576000] // 设置上传文件的大小限制
    ]
};
// createSignature(); // 改成先获取accessKey再生成签名

function check_object_radio() {
    // var tt = document.getElementsByName('myradio');
    // for (var i = 0; i < tt.length ; i++ )
    // {
    //     if(tt[i].checked)
    //     {
    //         g_object_name_type = tt[i].value;
    //         break;
    //     }
    // }
    g_object_name_type = "local_name";
}

function get_dirname()
{
    // dir = document.getElementById("dirname").value;
    dir = "file/public/develop_resources/YB/Prod";
    if (dir != '' && dir.indexOf('/') != dir.length - 1);
    {
        dir = dir + '/';
    }
    g_dirname = dir;
}

function random_string(len) {
　　len = len || 32;
　　var chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';   
　　var maxPos = chars.length;
　　var pwd = '';
　　for (i = 0; i < len; i++) {
    　　pwd += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return pwd;
}

function get_suffix(filename) {
    pos = filename.lastIndexOf('.');
    suffix = '';
    if (pos != -1) {
        suffix = filename.substring(pos);
    }
    return suffix;
}

function calculate_object_name(filename)
{
    if (g_object_name_type == 'local_name')
    {
        g_object_name += "${filename}";
    }
    else if (g_object_name_type == 'random_name')
    {
        suffix = get_suffix(filename);
        g_object_name = g_dirname + random_string(10) + suffix;
    }
    return '';
}

function get_uploaded_object_name(filename)
{
    if (g_object_name_type == 'local_name')
    {
        tmp_name = g_object_name;
        tmp_name = tmp_name.replace("${filename}", filename);
        return tmp_name;
    }
    else if(g_object_name_type == 'random_name')
    {
        return g_object_name;
    }
}

// 上传文件的核心代码-YB
function set_upload_param(up, filename, ret)
{
    g_object_name = g_dirname;
    if (filename != '') {
        suffix = get_suffix(filename)
        calculate_object_name(filename)
    }
    // debugger;
    new_multipart_params = {
        'key' : g_object_name,
        'policy': policyBase64,
        'OSSAccessKeyId': accessid, 
        'success_action_status' : '200', //让服务端返回200,不然，默认会返回204
        'signature': signature,
    };
    // console.log(JSON.stringify(new_multipart_params));

    up.setOption({
        'url': host,
        'multipart_params': new_multipart_params
    });

    up.start();
}

var uploader = new plupload.Uploader({
	runtimes : 'html5,flash,silverlight,html4',
	browse_button : 'selectfiles', 
    //multi_selection: false,
	container: document.getElementById('container'),
	flash_swf_url : 'lib/plupload-2.1.2/js/Moxie.swf',
	silverlight_xap_url : 'lib/plupload-2.1.2/js/Moxie.xap',
    url : 'https://oss.aliyuncs.com',

	init: {
		PostInit: function() {
			document.getElementById('ossfile').innerHTML = '';
			document.getElementById('postfiles').onclick = function() {
                set_upload_param(uploader, '', false);
                return false;
			};
		},

		FilesAdded: function(up, files) {
			plupload.each(files, function(file) {
				document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ')<b></b>'
				+'<div class="progress"><div class="progress-bar" style="width: 0%"></div></div>'
				+'</div>';
			});
		},

		BeforeUpload: function(up, file) {
            check_object_radio();
            get_dirname();
            set_upload_param(up, file.name, true);
        },

		UploadProgress: function(up, file) {
			var d = document.getElementById(file.id);
			d.getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
            var prog = d.getElementsByTagName('div')[0];
			var progBar = prog.getElementsByTagName('div')[0]
			progBar.style.width= 2*file.percent+'px';
			progBar.setAttribute('aria-valuenow', file.percent);
		},

		FileUploaded: function(up, file, info) {
            if (info.status == 200)
            {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload to oss success, object name:' + get_uploaded_object_name(file.name);
            }
            else
            {
                document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = info.response;
            } 
		},

		Error: function(up, err) {
			document.getElementById('console').appendChild(document.createTextNode("\nError xml:" + err.response));
            alert("yb upload error: " + err.response);
		}
	}
});

// YB 2021-04-05 本准备通过获取远端oss配置信息后再进行初始化然后上传文件，然而获取信息初始化均正常，在上传时报错403 forbidden SignatureDoesNotMatch
// YB 2021-05-12 解决签名不匹配问题，原因是在调整后，还没获取到accessKey就生成签名了，已优化
// 读取远端oss配置的json文件
readOssJson();
function readOssJson() {
    let url = "https://yuanbao-oss.oss-cn-shenzhen.aliyuncs.com/file/public/develop_resources/YB/Prod/" + ossPropFileName;
    fetch(url)
        .then((res) => res.text())
        .then((data) => {
            solveJsonOssProp(data); // 解析oss配置信息

            uploader.init(); // 初始化uploader组件
        })
        .catch((err) => console.log(err));
}
function solveJsonOssProp(text) {
    var data = eval('(' + text + ')');
    accessid = data.accessKeyId;
    accesskey = data.accessKeySecret;
    // 改作https -20250213
    host = 'https://' + data.bucket + '.' + data.region + '.aliyuncs.com' ;
    console.log("accessid:" + accessid+"\naccesskey:" + accesskey + "\nhost:" + host);
    createSignature(); // YB-创建签名
}

function createSignature() {
    policyBase64 = Base64.encode(JSON.stringify(policyText));
    message = policyBase64;
    var bytes = Crypto.HMAC(Crypto.SHA1, message, accesskey, { asBytes: true }) ;
    signature = Crypto.util.bytesToBase64(bytes);
}

// uploader.init(); // 初始化uploader组件