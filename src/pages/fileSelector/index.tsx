import Empty from "@/components/base/empty";
import IconButton from "@/components/base/iconButton";
import Loading from "@/components/base/loading";
import StatusBar from "@/components/base/statusBar";
import Button from "@/components/base/textButton.tsx";
import ThemeText from "@/components/base/themeText";
import VerticalSafeAreaView from "@/components/base/verticalSafeAreaView";
import globalStyle from "@/constants/globalStyle";
import i18n from "@/core/i18n";
import { useParams } from "@/core/router";
import useColors from "@/hooks/useColors";
import useHardwareBack from "@/hooks/useHardwareBack";
import rpx from "@/utils/rpx";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
    ExternalStorageDirectoryPath,
    readDir,
} from "react-native-fs";
import safUtil from "@/native/safUtil";
import { FlatList } from "react-native-gesture-handler";
import FileItem from "./fileItem";

interface IPathItem {
    path: string;
    parent: null | IPathItem;
}

interface IFileItem {
    path: string;
    type: "file" | "folder";
    /** 可选显示名称（用于存储根目录等 path 不友好的场景） */
    name?: string;
}

const ITEM_HEIGHT = rpx(96);

export default function FileSelector() {
    const {
        fileType = "file-and-folder",
        multi = true,
        actionText = i18n.t("common.sure"),
        matchExtension,
        onAction,
    } = useParams<"file-selector">() ?? {};

    const [currentPath, setCurrentPath] = useState<IPathItem>({
        path: "/",
        parent: null,
    });
    const currentPathRef = useRef<IPathItem>(currentPath);
    const [filesData, setFilesData] = useState<IFileItem[]>([]);
    const [checkedItems, setCheckedItems] = useState<IFileItem[]>([]);

    const checkedPaths = useMemo(
        () => checkedItems.map(_ => _.path),
        [checkedItems],
    );
    const navigation = useNavigation();
    const colors = useColors();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            // 路径变化时，重新读取
            setLoading(true);
            try {
                if (currentPath.path === "/") {
                    // 根目录：列出所有存储卷（内部存储 + USB + SD卡）
                    try {
                        const storagePaths = await safUtil.getAllStoragePaths();
                        const items: IFileItem[] = storagePaths.map(p => {
                            let name = p;
                            if (p === ExternalStorageDirectoryPath || p === "/storage/emulated/0") {
                                name = "内部存储";
                            } else if (p.includes("usb")) {
                                name = "USB 存储 (" + p.substring(p.lastIndexOf("/") + 1) + ")";
                            } else {
                                name = p.substring(p.lastIndexOf("/") + 1) || p;
                            }
                            return { type: "folder", path: p, name };
                        });
                        setFilesData(items);
                    } catch {
                        // 降级：只显示内部存储
                        setFilesData([
                            { type: "folder", path: ExternalStorageDirectoryPath, name: "内部存储" },
                        ]);
                    }
                } else {
                    const res = (await readDir(currentPath.path)) ?? [];
                    let folders: IFileItem[] = [];
                    let files: IFileItem[] = [];
                    if (
                        fileType === "folder" ||
                        fileType === "file-and-folder"
                    ) {
                        folders = res
                            .filter(_ => _.isDirectory())
                            .map(_ => ({
                                type: "folder",
                                path: _.path,
                            }));
                    }
                    if (fileType === "file" || fileType === "file-and-folder") {
                        files = res
                            .filter(
                                _ =>
                                    _.isFile() &&
                                    (matchExtension
                                        ? matchExtension(_.path)
                                        : true),
                            )
                            .map(_ => ({
                                type: "file",
                                path: _.path,
                            }));
                    }
                    setFilesData([...folders, ...files]);
                }
            } catch {
                setFilesData([]);
            }
            setLoading(false);
            currentPathRef.current = currentPath;
        })();
    }, [currentPath.path]);

    useHardwareBack(() => {
        // 注意闭包
        const _currentPath = currentPathRef.current;
        if (_currentPath.parent !== null) {
            setCurrentPath(_currentPath.parent);
        } else {
            navigation.goBack();
        }
        return true;
    });

    const selectPath = useCallback(
        (item: IFileItem | IFileItem[], nextChecked: boolean) => {
            if (multi) {
                if (!Array.isArray(item)) {
                    item = [item];
                }
                setCheckedItems(prev => {
                    const itemPaths = (item as IFileItem[]).map(_ => _.path);
                    const newCheckedItem = prev.filter(
                        _ => !itemPaths.includes(_.path),
                    );
                    if (nextChecked) {
                        return [...newCheckedItem, ...(item as IFileItem[])];
                    } else {
                        return newCheckedItem;
                    }
                });
            } else {
                setCheckedItems(
                    nextChecked ? (Array.isArray(item) ? item : [item]) : [],
                );
            }
        },
        [],
    );

    const renderItem = ({ item }: { item: IFileItem }) => (
        <FileItem
            path={item.path}
            name={item.name}
            type={item.type}
            parentPath={currentPath.path}
            onItemPress={currentChecked => {
                if (item.type === "folder") {
                    setCurrentPath(prev => ({
                        parent: prev,
                        path: item.path,
                    }));
                } else {
                    selectPath(item, !currentChecked);
                }
            }}
            checked={checkedPaths.includes(item.path)}
            onCheckedChange={checked => {
                selectPath(item, checked);
            }}
        />
    );

    const currentPageAllChecked = useMemo(() => {
        return (
            filesData.length &&
            filesData.every(file => checkedPaths.includes(file.path))
        );
    }, [filesData, checkedPaths]);

    const renderHeader = () => {
        return multi ? (
            <View style={style.selectAll}>
                <Button
                    onPress={() => {
                        if (currentPageAllChecked) {
                            selectPath(filesData, false);
                        } else {
                            selectPath(filesData, true);
                        }
                    }}>
                    {currentPageAllChecked ? "全不选" : "全选"}
                </Button>
            </View>
        ) : null;
    };

    return (
        <VerticalSafeAreaView style={globalStyle.fwflex1}>
            <StatusBar />
            <View style={[style.header, { backgroundColor: colors.appBar }]}>
                <IconButton
                    sizeType="small"
                    name="arrow-long-left"
                    color={colors.appBarText}
                    onPress={() => {
                        // 返回上一级
                        if (currentPath.parent !== null) {
                            setCurrentPath(currentPath.parent);
                        }
                    }}
                />
                <ThemeText
                    numberOfLines={2}
                    ellipsizeMode="head"
                    fontColor={"appBarText"}
                    style={style.headerPath}>
                    {currentPath.path}
                </ThemeText>
            </View>
            {loading ? (
                <Loading />
            ) : (
                <>
                    <FlatList
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={Empty}
                        style={globalStyle.fwflex1}
                        data={filesData}
                        getItemLayout={(_, index) => ({
                            length: ITEM_HEIGHT,
                            offset: ITEM_HEIGHT * index,
                            index,
                        })}
                        renderItem={renderItem}
                    />
                </>
            )}
            <Pressable
                onPress={async () => {
                    if (checkedItems.length) {
                        const shouldBack = await onAction?.(checkedItems);
                        if (shouldBack) {
                            navigation.goBack();
                        }
                    }
                }}>
                <View
                    style={[
                        style.scanBtn,
                        {
                            backgroundColor: colors.appBar,
                        },
                    ]}>
                    <ThemeText
                        fontColor={"appBarText"}
                        opacity={checkedItems.length > 0 ? undefined : 0.6}>
                        {actionText}
                        {multi && checkedItems?.length > 0
                            ? ` (选中${checkedItems.length})`
                            : ""}
                    </ThemeText>
                </View>
            </Pressable>
        </VerticalSafeAreaView>
    );
}

const style = StyleSheet.create({
    header: {
        height: rpx(88),
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: rpx(24),
    },
    headerPath: {
        marginLeft: rpx(28),
    },
    scanBtn: {
        width: "100%",
        height: rpx(120),
        alignItems: "center",
        justifyContent: "center",
    },
    selectAll: {
        width: "100%",
        height: ITEM_HEIGHT,
        paddingHorizontal: rpx(24),
        flexDirection: "row",
        alignItems: "center",
    },
});
