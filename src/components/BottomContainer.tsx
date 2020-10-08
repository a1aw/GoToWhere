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
import panelStyles from '../styles/panel';
import BottomSheetBehavior from 'reanimated-bottom-sheet';

interface IProps {
    currentRegion: object | boolean
}

interface IState {

}

export default class BottomContainer extends React.Component<IProps, IState> {
    renderPanel = () => (
        <>
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
        </>
    )

    renderInner = () => (
        {
            if (Platform.OS == 'ios')
        }
        <CompatBlurView blurType="xlight" blurAmount={10} style={panelStyles.panel} render={this.renderPanel} />
    )

    renderHeader = () => (
        <CompatBlurView blurType="xlight" blurAmount={10} style={panelStyles.header} render={() => (
            <View style={panelStyles.panelHeader}>
                <View style={panelStyles.panelHandle} />
            </View>
        )} />
    )

    bs: React.RefObject<BottomSheetBehavior> = React.createRef();

    componentDidMount() {

    }

    componentDidUpdate() {
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