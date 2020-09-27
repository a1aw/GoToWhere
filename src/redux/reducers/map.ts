import { MAP_REGION_CHANGED, MAP_REGION_CHANGE_COMPLETED } from '../actionTypes';

const INITIAL_STATE: IState = {
    lastMapRegion: null
}

interface IState {
    lastMapRegion: IMapRegion | null
}

interface IMapRegion {
    latitude: number,
    longitude: number
}

interface IAction {
    type: string
}

const map = (state = INITIAL_STATE, action: IAction) => {
    switch (action.type) {
        case 'ADD_TODO':
            return state;
        case 'TOGGLE_TODO':
            return state.map(todo =>
                todo.id === action.id ? { ...todo, completed: !todo.completed } : todo
            )
        default:
            return state
    }
}

export default map