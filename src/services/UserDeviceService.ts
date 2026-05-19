import {
    collection,
    deleteDoc,
    doc,
    getDocs,
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

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
    ) as Partial<T>;
}

function userDeviceCollection(uid: string) {
    return collection(db, "users", uid, "devices");
}

function userDeviceDoc(uid: string, deviceId: string){
    return doc(db, "users", uid, "devices", deviceId)
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
            status:
                data.status === "online" || data.status === "offline"
                    ? data.status
                    : "unknown",
        };
    });
}

export async function pairUserDevice(uid:string, device:UserDevice): Promise<void> {
    const payload = removeUndefinedFields({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        source: device.source,
        pairingCode: device.pairingCode,
        pairedAt: device.pairedAt,
        lastSeenAt: device.lastSeenAt,
        status: device.status,
    });

    await setDoc(userDeviceDoc(uid, device.deviceId), payload, { merge: true});
}

export async function unpairUserDevice(uid:string, deviceId:string): Promise<void> {
    await deleteDoc(userDeviceDoc(uid, deviceId));
}
