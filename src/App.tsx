import React from 'react';
import { Platform, StyleSheet, Dimensions, Modal, findNodeHandle } from 'react-native';
import { Provider } from 'react-redux';
import MapView from 'react-native-maps';

import BottomContainer from './components/BottomContainer'
import store from './redux/store';
import SafeArea from 'react-native-safe-area';
import CompatBlurView from './components/CompatBlurView';
import { BlurView } from '@react-native-community/blur';

const styles = StyleSheet.create({
    map: {
        flex: 1
    },
    notchBlur: {
        position: "absolute",
        left: 0,
        top: 0,
        width: Dimensions.get("window").width,
        height: 0
    }
});

interface IProps {

}

interface IState {
    currentRegion: boolean | object,
    blurHeight: number,
    notchBlurHeight: number
}

export default class App extends React.Component<IProps, IState> {

    componentDidMount() {
        this.setState({
            currentRegion: false,
            blurHeight: 0
        });

        if (Platform.OS === "ios") {
            SafeArea.getSafeAreaInsetsForRootView().then((results) => {
                this.setState({
                    notchBlurHeight: results.safeAreaInsets.top
                });
            });
        }
    }

    mapOnRegionChange = (region: object) => {
        //console.log(region);
    }

    render() {
        return (
            <Provider store={store}>
                <MapView style={styles.map} showsMyLocationButton={true} showsUserLocation={true} onRegionChange={this.mapOnRegionChange}>
                    
                </MapView>
                {
                    Platform.OS === "ios" &&　
                    <BlurView 
                        blurType="light" 
                        blurAmount={5}
                        style={[styles.notchBlur, { height: this.state && this.state.notchBlurHeight }]} />
                }
                <BottomContainer currentRegion={this.state && this.state.currentRegion}/>
            </Provider>
        );
    }
}