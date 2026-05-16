import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import {db} from "@/lib/firebase";

export type UserDeviceSource = "esp32" | "wokwi";

export type UserDevice = {
    deviceId: string;
    deviceName: string;
    source: UserDeviceSource;
    pairingCode: string;
    pairedAt: number;
    lastSeenAt?: number;
    status?: "online" | "offline" | "unknown";
};

export type ActiveCommandDevice = {
    deviceId: string;
    deviceName: string;
    source: UserDeviceSource;
    selectedByUid: string;
    selectedAt?: unknown;
    lastSeenAt?: number | null;
    status?: "online" | "offline" | "unknown";
};

function userDeviceCollection(uid: string) {
    return collection(db, "users", uid, "devices");
}

function userDeviceDoc(uid: string, deviceId: string){
    return doc(db, "users", uid, "devices", deviceId)
}

function activeCommandDeviceDoc() {
    return doc(db, "system_settings", "active_device");
}

function normalizeDeviceStatus(status: UserDevice["status"]): "online" | "offline" | "unknown" {
    return status === "online" || status === "offline" ? status : "unknown";
}

function toFirestoreUserDevice(device: UserDevice): UserDevice {
    return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        source: device.source,
        pairingCode: device.pairingCode,
        pairedAt: typeof device.pairedAt === "number" ? device.pairedAt : Date.now(),
        lastSeenAt: typeof device.lastSeenAt === "number" ? device.lastSeenAt : null as never,
        status: normalizeDeviceStatus(device.status),
    };
}

export async function listUserDevices(uid:string): Promise<UserDevice[]> {
    const snapshot = await getDocs(userDeviceCollection(uid));

    return snapshot.docs.map((item) => {
        const data = item.data() as Partial<UserDevice>;

        return {
            deviceId: data.deviceId ?? item.id,
            deviceName: data.deviceName ?? item.id,
            source: data.source === "wokwi" ? "wokwi" : "esp32",
            pairingCode: data.pairingCode ?? "",
            pairedAt: typeof data.pairedAt === "number" ? data.pairedAt : Date.now(),
            lastSeenAt: typeof data.lastSeenAt === "number" ? data.lastSeenAt : undefined,
            status: normalizeDeviceStatus(data.status),
        };
    });
}

export async function pairUserDevice(uid:string, device:UserDevice): Promise<void> {
    await setDoc(userDeviceDoc(uid, device.deviceId), toFirestoreUserDevice(device), { merge: true});
}

export async function setActiveCommandDevice(uid: string, device: UserDevice): Promise<void> {
    await setDoc(
        activeCommandDeviceDoc(),
        {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            source: device.source,
            selectedByUid: uid,
            selectedAt: serverTimestamp(),
            lastSeenAt: typeof device.lastSeenAt === "number" ? device.lastSeenAt : null,
            status: normalizeDeviceStatus(device.status),
        },
        { merge: true },
    );
}

export async function unpairUserDevice(uid:string, deviceId:string): Promise<void> {
    await deleteDoc(userDeviceDoc(uid, deviceId));
}