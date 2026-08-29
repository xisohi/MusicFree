import { NativeModules, Platform } from "react-native";

interface ISafUtil {
    /** 获取所有可用存储卷的文件系统路径（内部存储+USB+SD卡），不依赖 DocumentsUI */
    getAllStoragePaths: () => Promise<string[]>;
    /** 删除文档，成功返回 true */
    deleteDocument: (uri: string) => Promise<boolean>;
}

const SafUtil = NativeModules.SafUtil as ISafUtil | undefined;

const isSupported =
    Platform.OS === "android" && !!SafUtil?.getAllStoragePaths;

/** 在不支持的平台（如 iOS）上提供降级实现，调用方无需特判 */
const safUtil: ISafUtil = {
    getAllStoragePaths: async () => {
        if (!isSupported) {
            return ["/storage/emulated/0"];
        }
        return SafUtil!.getAllStoragePaths();
    },
    deleteDocument: async uri => {
        if (!isSupported) {
            return false;
        }
        return SafUtil!.deleteDocument(uri);
    },
};

export { isSupported as isSafSupported };
export default safUtil;
