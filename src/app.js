import React from 'react';
import { StyleSheet, Dimensions, Modal } from 'react-native';
import { Provider } from 'react-redux';
import MapView from 'react-native-maps';

import BottomContainer from './components/BottomContainer'
import store from './redux/store';
import SafeArea from 'react-native-safe-area';
import CompatBlurView from './components/CompatBlurView';

const styles = StyleSheet.create({
  map: {
    flex: 1
  }
});

export default class App extends React.Component {

  componentDidMount(){
    this.setState({
      currentRegion: false,
      blurHeight: 0
    });
    SafeArea.getSafeAreaInsetsForRootView().then((results) => {
      this.setState({
        blurHeight: results.safeAreaInsets.top
      });
    });
  }

  render() {
    return (
      <Provider store={store}>
        <MapView style={styles.map} showsMyLocationButton={true} showsUserLocation={true} onRegionChange={(region) => {
          this.setState({
            currentRegion: region
          });
        }}>

        </MapView>
        <CompatBlurView blurType="light" style={{position: "absolute", left: 0, top: 0, width: Dimensions.get("window").width, height: this.state && this.state.blurHeight}}/>
        <BottomContainer currentRegion={this.state && this.state.currentRegion} />
      </Provider>
    );
  }
}