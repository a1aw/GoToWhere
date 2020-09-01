import React from 'react';
import { View, Platform, Alert } from 'react-native';
import { BlurView, VibrancyView } from '@react-native-community/blur';
import DeviceInfo from 'react-native-device-info';

interface IProps {
    blurType: "xlight" | "light" | "dark" | "regular" | "prominent" | "extraDark",
    blurAmount: number,
    style: object
}

const CompatBlurView: React.FC<IProps> = (props) => {
    if (Platform.OS === "ios") {
        // ||
        //(Platform.OS === "android" && DeviceInfo.getApiLevelSync() >= 23)
        return <BlurView blurType={props.blurType} blurAmount={props.blurAmount} style={props.style} />
    } else {
        //props.style.backgroundColor = "#f7f5eee8";
        return <View style={props.style} />
    }
};

export default CompatBlurView;