//GTW Database
import Dexie from 'dexie';

export var db = new Dexie("gtw-db");

db.version(2).stores({
    "pluginStorage": "package",
    "transitReference": "[package+provider]"
});

export async function putPluginStorage(pkg, data) {
    var clone = Object.assign({}, data);
    return await db["pluginStorage"].put({
        "package": pkg,
        data: clone
    });
};

export async function getPluginStorage(pkg) {
    return await db["pluginStorage"].where("package")
        .equals(pkg).first();
}

export async function getTransitReference(pkg, provider) {
    return await db["transitReference"].where("[package+provider]")
        .equals([pkg, provider]).first();
}

export async function putTransitReference(data) {
    if (!data["package"] || !data["provider"]) {
        console.error("Error: Database missing package or provider parameter(s).");
        return;
    }
    return await db["transitReference"].put(data);
}