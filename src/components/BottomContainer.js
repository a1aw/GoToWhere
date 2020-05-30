import React from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Dimensions
} from 'react-native';
import CompatBlurView from './CompatBlurView';
import BottomSheet from 'reanimated-bottom-sheet'

export default class BottomContainer extends React.Component {
  renderInner = () => (
    <CompatBlurView blurType="xlight" blurAmount={80} style={styleObjs.panel}>
      <Text style={styles.panelTitle}>San Francisco Airport</Text>
      <Text style={styles.panelSubtitle}>
        International Airport - 40 miles away
      </Text>
      <View style={styles.panelButton}>
        <Text style={styles.panelButtonTitle}>Directions</Text>
      </View>
      <View style={styles.panelButton}>
        <Text style={styles.panelButtonTitle}>Search Nearby</Text>
      </View>
    </CompatBlurView>
  )

  renderHeader = () => (
    <CompatBlurView blurType="xlight" blurAmount={80} style={styleObjs.header}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHandle} />
      </View>
    </CompatBlurView>
  )

  bs = React.createRef();

  constructor(props){
    super(props);
  }

  componentDidMount(){

  }

  componentDidUpdate(){
      if (this.lastRegion && this.props.currentRegion &&
	      this.props.currentRegion.latitude !== this.lastRegion.latitude &&
	      this.props.currentRegion.longitude !== this.lastRegion.longitude){
          this.bs.current.snapTo(2);
      }
      this.lastRegion = this.props.currentRegion;
  }

  render() {
    return (
        <BottomSheet
            ref={this.bs}
            snapPoints={["90%", "30%", "10%"]}
            renderContent={this.renderInner}
            renderHeader={this.renderHeader}
            initialSnap={1}
        />
    )
  }
}

const styleObjs = {
  panel: {
    height: 720,
    padding: 20,
    backgroundColor: '#f7f5eee8'//rgba(255,255,255,0)',
  },
  header: {
    backgroundColor: '#f7f5eee8',//rgba(255,255,255,0)', //#f7f5eee8
    shadowColor: '#000000',
    paddingTop: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  panelContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  panelHeader: {
    alignItems: 'center',
  },
  panelHandle: {
    width: 35,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 27,
    height: 35,
  },
  panelSubtitle: {
    fontSize: 14,
    color: 'gray',
    height: 30,
    marginBottom: 10,
  },
  panelButton: {
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#318bfb',
    alignItems: 'center',
    marginVertical: 10,
  },
  panelButtonTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
  }
})