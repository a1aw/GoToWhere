console.log("Start of worker");
var infos = [];
var running = false;
var proms = [];

this.onmessage = function (evt) {
    this.postMessage(evt.data);
    console.log("received message!");
    console.log(evt);
    infos = infos.concat(evt.data);
    if (!running) {
        console.log("forcing to run task")
        task();
        running = true;
    }
};

var task = function () {
    console.log("RUN TSAK");
    while (infos.length > 0) {
        console.log("INFO:");
        var info = infos.shift();
        console.log(info);
        var i;
        for (i = 0; i < info.chunks; i++) {
            console.log("CHUNK: " + i);
            proms.push(new Promise((resolve, reject) => {
                console.log("RUNNING");
                //var sst = Date.now();
                var o = Date.now();
                var chunk = "";
                info.zip.file(info.dataType + "-" + i + ".json").internalStream("string")
                    .on("data", function (data) {
                        chunk += data;
                        //console.log(info.dataType + "Data return " + (++i) + " used " + (Date.now() - sst));
                        //sst = Date.now();
                    })
                    .on("error", function (err) {

                    })
                    .on("end", function () {
                        console.log("End used " + (Date.now() - o) + " ms");
                        var s = Date.now();
                        var x = JSON.parse(chunk);
                        console.log("got dt: " + x.dataType);
                        console.log("parsing used " + (Date.now() - s));
                        resolve();
                    })
                    .resume();
            }));
        }
        console.log("FIN");
    }
    console.log("OUT LOOP");
    running = false;
};

this.postMessage("Marco!");

console.log("End of worker");
