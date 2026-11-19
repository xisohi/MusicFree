import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import rpx from "@/utils/rpx";
import Slider from "@react-native-community/slider";
import ReactNativeTrackPlayer from "react-native-track-player";
import PersistStatus from "@/utils/persistStatus";
import i18n from "@/core/i18n";
import { fontSizeConst } from "@/constants/uiConst";

/**
 * 播放器内音量调节
 * 通过 RNTrackPlayer.setVolume 调整播放器输出音量（不改系统媒体音量）
 */
export default function VolumeBar() {
    const persisted = PersistStatus.useValue("music.volume", 100);
    const [volume, setVolume] = useState<number>(
        typeof persisted === "number" ? persisted : 100,
    );
    const [tmpVolume, setTmpVolume] = useState<number | null>(null);
    const slidingRef = useRef(false);
    const lastAppliedRef = useRef<number>(-1);
    const lastApplyTimeRef = useRef<number>(0);

    const applyVolume = (val: number, force?: boolean) => {
        const now = Date.now();
        if (!force && now - lastApplyTimeRef.current < 50) {
            return;
        }
        if (Math.abs(val - lastAppliedRef.current) < 1) {
            return;
        }
        lastAppliedRef.current = val;
        lastApplyTimeRef.current = now;
        ReactNativeTrackPlayer.setVolume(val / 100).catch(() => {});
    };

    const displayVolume = tmpVolume ?? volume;

    return (
        <View style={style.wrapper}>
            <Text style={style.text}>{i18n.t("musicDetail.volume")}</Text>
            <Slider
                style={style.slider}
                minimumTrackTintColor={"#cccccc"}
                maximumTrackTintColor={"#999999"}
                thumbTintColor={"#dddddd"}
                minimumValue={0}
                maximumValue={100}
                step={1}
                onSlidingStart={() => {
                    slidingRef.current = true;
                }}
                onValueChange={val => {
                    if (slidingRef.current) {
                        setTmpVolume(val);
                        applyVolume(val);
                    }
                }}
                onSlidingComplete={val => {
                    slidingRef.current = false;
                    setTmpVolume(null);
                    setVolume(val);
                    applyVolume(val, true);
                    PersistStatus.set("music.volume", val);
                }}
                value={volume}
            />
            <Text style={style.text}>{`${Math.round(displayVolume)}%`}</Text>
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(40),
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
    },
    slider: {
        width: "65%",
        height: rpx(40),
    },
    text: {
        width: rpx(80),
        textAlign: "center",
        fontSize: fontSizeConst.description,
        includeFontPadding: false,
        color: "#cccccc",
    },
});
