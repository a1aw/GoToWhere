// Real Origin
const key = "mob41/OpenETA/master";
const host = "l19jh70wb5d2vfmb.gq";
function start(suffix) {
	var o = btoa(key);
	window.location = "https://" + host + "/#p:" + o + suffix;
}
function install() {
	if (window.location.hash) {
		var c = window.location.hash.substring(1);
		start("&r:install:" + c);
	} else {
		$(".modal-header").html("Error");
		$(".modal-body").html("No install code detected. Make sure your install code is put in the following format:<br /><code>https://www.openeta.ml/install#&#x3C;InstallCodeHere&#x3C;</code>");
	}
}