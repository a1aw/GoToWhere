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
import panelStyles from './PanelStyleSheet';

export default class BottomContainer extends React.Component {
  renderInner = () => (
    <CompatBlurView blurType="xlight" blurAmount={80} style={panelStyles.panel}>
      <Text style={panelStyles.panelTitle}>San Francisco Airport</Text>
      <Text style={panelStyles.panelSubtitle}>
        International Airport - 40 miles away
      </Text>
      <View style={panelStyles.panelButton}>
        <Text style={panelStyles.panelButtonTitle}>Directions</Text>
      </View>
      <View style={panelStyles.panelButton}>
        <Text style={panelStyles.panelButtonTitle}>Search Nearby</Text>
      </View>
    </CompatBlurView>
  )

  renderHeader = () => (
    <CompatBlurView blurType="xlight" blurAmount={80} style={panelStyles.header}>
      <View style={panelStyles.panelHeader}>
        <View style={panelStyles.panelHandle} />
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
      /*
      if (this.lastRegion && this.props.currentRegion &&
	      this.props.currentRegion.latitude !== this.lastRegion.latitude &&
	      this.props.currentRegion.longitude !== this.lastRegion.longitude){
          this.bs.current.snapTo(2);
      }
      this.lastRegion = this.props.currentRegion;
      */
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