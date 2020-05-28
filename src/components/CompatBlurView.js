import React from 'react';
import { View, Platform, Alert } from 'react-native';
import { BlurView, VibrancyView } from 'react-native-blur';
import DeviceInfo from 'react-native-device-info';

export default function (props){
    if (Platform.OS === "ios" ||
        (Platform.OS === "android" && DeviceInfo.getApiLevelSync() >= 23)){
        return <BlurView {...props} />
    } else {
        props.style.backgroundColor = "#f7f5eee8";
        return <View {...props} />
    }
}