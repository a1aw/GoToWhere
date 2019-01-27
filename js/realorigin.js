// Real Origin
const key = "mob41/OpenETA/master";
const host = "l19jh70wb5d2vfmb.gq";
function start() {
	var o = btoa(key);
	window.location = "https://" + host + "/#p:" + o;
}