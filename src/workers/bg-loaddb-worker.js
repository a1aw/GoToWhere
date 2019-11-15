import * as Misc from '../gtw-misc';
import { db } from '../gtw-citydata-transit-gtfs';

self.addEventListener("message", evt => {
    task(evt.data);
});

async function task(fileName) {
    var count = await db[fileName + "_raw"].count();
    var i;
    var j;
    var k;
    var m;
    var init;
    var nextInit;
    var len;
    var obj;
    var objs;
    var data;
    var rowsPerPercent;
    self.postMessage({
        type: 1,
        stage: fileName
    });
    for (i = 0; i < count; i++) {
        data = await db[fileName + "_raw"].offset(i).limit(1).first();
        rowsPerPercent = Math.ceil(data.rows.length / 100);
        for (j = 0; j < 100; j++) {
            objs = [];
            init = rowsPerPercent * j;
            nextInit = rowsPerPercent * (j + 1);
            len = data.rows.length > nextInit ? nextInit : data.rows.length;
            console.log("Building " + j + "%:" + init);
            for (k = init; k < len; k++) {
                obj = {};
                for (m = 0; m < data.headers.length; m++) {
                    if (data.headerTypes[m] === "int") {
                        obj[data.headers[m]] = parseInt(data.rows[k][m]);
                    } else if (data.headerTypes[m] === "float") {
                        obj[data.headers[m]] = parseFloat(data.rows[k][m]);
                    } else {
                        obj[data.headers[m]] = data.rows[k][m];
                    }
                }
                obj["package"] = data["package"];
                obj["provider"] = data["provider"];
                objs.push(obj);
            }
            console.log("Putting to db");
            await db[fileName].bulkAdd(objs);
            console.log("Done");
            self.postMessage({
                type: 2,
                progress: ((j + 1) / count + i * 100 / count)
            });
        }
    }
    self.postMessage({
        type: 0
    });
}