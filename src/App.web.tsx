import React from 'react';
import { StyleSheet, Dimensions, Text } from 'react-native';
import { Provider } from 'react-redux';
//import MapView from 'react-native-maps';

//import BottomContainer from './components/BottomContainer'
import store from './redux/store';
//import SafeArea from 'react-native-safe-area';
//import CompatBlurView from './components/CompatBlurView';

const styles = StyleSheet.create({
  map: {
    flex: 1
  }
});

export default class App extends React.Component {

  componentDidMount(){
	  
  }

  render() {
    return (
      <Provider store={store}>
        <Text>HiTesting</Text>
      </Provider>
    );
  }
}