import axios from "axios";
import { compare } from "compare-versions";
import DeviceInfo from "react-native-device-info";

const updateList = [
    "https://xhys.xisohi.dpdns.org/update/MusicFree.json",
];

interface IUpdateInfo {
    needUpdate: boolean;
    data: {
        version: string;
        changeLog: string[];
        download: string[];
    };
}

export default async function checkUpdate(): Promise<IUpdateInfo | undefined> {
    const currentVersion = DeviceInfo.getVersion();
    for (let i = 0; i < updateList.length; ++i) {
        try {
            const rawInfo = (await axios.get(updateList[i])).data;
            // 兼容 changeLog 为字符串（用 \n 分隔）的格式
            if (typeof rawInfo.changeLog === "string") {
                rawInfo.changeLog = rawInfo.changeLog.split("\n");
            }
            if (compare(rawInfo.version, currentVersion, ">")) {
                return {
                    needUpdate: true,
                    data: rawInfo,
                };
            }
        } catch {}
    }
}
