import React from "react";
import { StyleSheet, View } from "react-native";
import rpx from "@/utils/rpx";
import SeekBar from "./seekBar";
import PlayControl from "./playControl";
import VolumeBar from "./volumeBar";
import useOrientation from "@/hooks/useOrientation";

export default function Bottom() {
    const orientation = useOrientation();
    return (
        <View
            style={[
                style.wrapper,
                orientation === "horizontal"
                    ? {
                        height: rpx(196),
                    }
                    : undefined,
            ]}>
            <SeekBar />
            <VolumeBar />
            <PlayControl />
        </View>
    );
}

const style = StyleSheet.create({
    wrapper: {
        width: "100%",
        height: rpx(280),
    },
});
