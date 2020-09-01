import { StyleSheet } from 'react-native';

export default StyleSheet.create({
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