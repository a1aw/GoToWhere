import React from 'react';
import { View, Platform, Alert, StyleProp, ViewStyle, findNodeHandle } from 'react-native';
import { BlurView, VibrancyView } from '@react-native-community/blur';
import DeviceInfo from 'react-native-device-info';

interface IProps {
    blurType: "xlight" | "light" | "dark" | "regular" | "prominent" | "extraDark",
    blurAmount: number,
    style: object,
    render?: Function
}

const BottomPanel: React.FC<IProps> = (props) => {
    if (Platform.OS === "ios") {
        return (
            <BlurView blurType={props.blurType} blurAmount={props.blurAmount} style={props.style}>
                {props.render && props.render()}
            </BlurView>
        );
    /*
    } else if (Platform.OS === "android" && DeviceInfo.getApiLevelSync() >= 23) {
        const [ref, setRef] = React.useState();
        return (
            <>
                <View ref={(dref) => {
                    setRef(dref);
                }} style={{ justifyContent: "center" }}>
                    {props.render &&
                        <View style={ {padding: 20} }>
                            {props.render()}
                        </View>
                    }
                </View>
                <BlurView viewRef={findNodeHandle(ref)} blurType="light" blurAmount={100} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}></BlurView>
            </>
        );
    */
    } else {
        return (
            <View style={props.style}>
                {props.render && props.render()}
            </View>
        );
    }
};

export default Com;