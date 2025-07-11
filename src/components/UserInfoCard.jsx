import { useAuth } from '../api/firebaseAuth';
import { Link } from 'react-router-dom';

export default function UserInfoCard() {
    const { currentUser, isLogin } = useAuth();

    if (!isLogin) {
        return (
            <div className='avatar'>
                <div className='w-10 rounded-full'></div>
            </div>
        );
    }

    return (
        <Link to='/account'>
            <img className='max-h-8 rounded-full' src={currentUser.photoURL} />
        </Link>
    );
}
