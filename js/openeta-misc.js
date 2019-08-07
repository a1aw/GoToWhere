//OpenETA Misc

var Misc = function () {

	this.geoDistance = function (lat1, lon1, lat2, lon2) {
		var p = 0.017453292519943295;    // Math.PI / 180
		var c = Math.cos;
		var a = 0.5 - c((lat2 - lat1) * p) / 2 +
			c(lat1 * p) * c(lat2 * p) *
			(1 - c((lon2 - lon1) * p)) / 2;

		return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
	}

	this.isSamePropertyValueInArray = function (array, name, value) {
		for (var object of array) {
			if (object[name] === value) {
				return true;
			}
		}
		return false;
	}

	this.fillZero = function (number) {
		return number < 10 ? ("0" + number) : number;
	}

}

class MultiTasker {

    constructor() {
        this.pcHandlers = [];
        this.handlers = [];
        this.args = [];
        this.tasks = [];
        this.remain = 0;
        this.taskProgress = 0;
    }

    setArgs(args) {
        this.args = args;
    }

    setTasks(tasks) {
        this.tasks = tasks;
        this.remain = tasks.length;
    }

    getTotalProgress() {
        return (this.taskProgress + 100.0 * (this.tasks.length - this.remain)) / this.tasks.length;
    }

    setTaskProgress(value) {
        if (value < 0) {
            value = 0;
        } else if (value > 100) {
            value = 100;
        }
        this.taskProgress = value;

        for (var pcHandler of this.pcHandlers) {
            if (pcHandler && typeof pcHandler === 'function') {
                pcHandler(this.getTotalProgress());
            }
        }
    }

    getTaskProgress() {
        return taskProgress;
    }

    start() {
        console.log(this)
        for (var i = 0; i < this.tasks.length; i++) {
            this.taskProgress = 0;
            var task = this.tasks[i];
            if (task && typeof task === 'function') {
                if (this.args && this.args.length > i) {
                    task(this.args[i]);
                } else {
                    task();
                }
            }
        }
    }

    dispatch() {
        for (var pcHandler of this.pcHandlers) {
            if (pcHandler && typeof pcHandler === 'function') {
                pcHandler(this.getTotalProgress());
            }
        }

        if (this.remain > 1) {
            this.remain--;
            return;
        }

        for (var handler of this.handlers) {
            if (handler && typeof handler === 'function') {
                handler(arguments);
            }
        }
    }

    progressChange(func) {
        if (func && typeof func === 'function') {
            if (this.tasks.length == 0) {
                func(100.0);
            }
            this.pcHandlers.push(func);
        }
        return this;
    }

    done(func) {
        if (func && typeof func === 'function') {
            if (this.tasks.length == 0) {
                func();
            }
            this.handlers.push(func);
        }
        return this;
    }

}