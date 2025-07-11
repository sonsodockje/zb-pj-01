import { app } from './firebase';
import {
    getFirestore,
    collection,
    addDoc,
    setDoc,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy,
    limit,
    startAfter,
    deleteDoc,
    updateDoc, // updateDoc 임포트 추가
} from 'firebase/firestore';

const db = getFirestore(app);

/**
 * Firestore에 상품 데이터를 업로드
 * @param {object} data - 업로드할 상품 데이터
 * @param {Function} setIsLoading - 로딩 상태 변경 함수
 * @param {Function} navigate - 업로드 성공 후 페이지 이동을 처리하는 함수
 */
export const productUpload = async (data, setIsLoading, navigate) => {
    try {
        const docRef = await addDoc(collection(db, 'products'), data);
        console.log('Document written with ID: ', docRef.id);

        if (navigate) {
            // navigate 함수가 제대로 전달되었는지 확인
            navigate('/'); // 업로드 성공 후 홈으로 이동
        }
    } catch (e) {
        console.error('Error adding document: ', e);
    } finally {
        setIsLoading(false);
    }
};

/**
 * Firestore에서 상품 목록을 가져옴 (전체)
 * @param {DocumentSnapshot} [lastVisibleDoc=null] - 마지막으로 가져온 문서의 스냅샷. 페이지네이션에 사용.
 * @param {number} [itemsPerPage=8] - 페이지당 가져올 상품 수
 * @returns {Promise<{products: Array<object>, lastVisible: DocumentSnapshot, hasMore: boolean}>} - 상품 목록, 마지막 문서 스냅샷, 추가 데이터 존재 여부를 포함하는 객체를 반환하는 Promise 객체
 * @throws {Error}
 */
export const productsFetch = async (
    lastVisibleDoc = null,
    itemsPerPage = 8,
) => {
    try {
        let q;
        if (lastVisibleDoc) {
            q = query(
                collection(db, 'products'),
                orderBy('timestamp', 'desc'),
                startAfter(lastVisibleDoc),
                limit(itemsPerPage),
            );
        } else {
            q = query(
                collection(db, 'products'),
                orderBy('timestamp', 'desc'),
                limit(itemsPerPage),
            );
        }

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('컬렉션에 문서가 없습니다.');
            return { products: [], lastVisible: null, hasMore: false };
        }

        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });

        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        const hasMore = products.length === itemsPerPage; // limit과 가져온 문서 수가 같으면 다음 페이지가 있을 가능성 있음

        console.log('컬렉션 문서 읽기 성공:', products);

        return { products, lastVisible, hasMore };
    } catch (error) {
        console.error('컬렉션 문서를 읽는 중 오류 발생:', error);
        throw error; // 오류를 호출자에게 다시 던집니다.
    }
};

/**
 * Firestore에서 ID로 특정 상품의 데이터를 가져옴
 * @param {string} id - 상품의 ID
 * @returns {Promise<object|null>} - 상품 데이터를 포함하는 Promise 객체를 반환하거나, 문서가 없으면 null을 반환
 */
export const productFetchById = async (id) => {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        console.log('Document data:', docSnap.data());
        return docSnap.data();
    } else {
        console.log('No such document!');
        return null;
    }
};

/**
 * Firestore에서 ID로 특정 상품을 삭제
 * @param {string} id - 상품의 ID
 * @throws {Error}
 */
export const deleteProductById = async (id) => {
    try {
        await deleteDoc(doc(db, 'products', id));
        console.log(`Document with ID ${id} successfully deleted!`);
    } catch (error) {
        console.error(`Error removing document with ID ${id}:`, error);
        throw new Error('상품 삭제 중 오류가 발생했습니다.');
    }
};

/**
 * Firestore에서 특정 상품의 데이터를 업데이트
 * @param {string} id - 업데이트할 상품의 ID
 * @param {object} data - 업데이트할 상품 데이터
 * @param {Function} setIsLoading - 로딩 상태 설정 함수
 * @param {Function} navigate - 페이지 이동 함수
 */
export const productUpdate = async (id, data, setIsLoading, navigate) => {
    try {
        const docRef = doc(db, 'products', id);
        await updateDoc(docRef, data);
        console.log('Document with ID ', id, ' successfully updated!');

        if (navigate) {
            navigate('/detail/' + id); // 업데이트 성공 후 상세 페이지로 이동
        }
    } catch (e) {
        console.error('Error updating document: ', e);
        alert('상품 업데이트 중 오류가 발생했습니다.');
    } finally {
        setIsLoading(false);
    }
};

/**
 * 사용자가 특정 상품에 '좋아요'를 누를 때 Firestore에 데이터를 저장
 * @param {string} productId - '좋아요'를 누른 상품의 ID
 * @param {string} currentUserId - 현재 로그인한 사용자의 ID
 */
export const userLike = async (productId, currentUserId) => {
    try {
        // 'user' 컬렉션 -> 'currentUserId' 문서 -> 'like' 서브컬렉션에 접근
        // productId를 문서의 ID로 사용합니다.
        // 이렇게 하면 동일한 productId로 두 번 '좋아요'를 시도해도,
        // 기존 문서가 덮어씌워지므로 중복이 발생하지 않습니다.
        const likeDocRef = doc(db, 'user', currentUserId, 'like', productId);

        // setDoc을 사용하여 문서를 추가하거나 덮어씁니다.
        // 문서 내용은 { likedAt: new Date() } 와 같이 원하는 필드를 포함할 수 있습니다.
        await setDoc(likeDocRef, {
            likedAt: new Date(), // 좋아요를 누른 시각
            // 여기에 추가적인 정보를 저장할 수 있습니다. 예를 들어,
            // productName: "상품 이름",
            // productImageUrl: "상품 이미지 URL"
        });

        console.log('Document set with ID: ', productId);
        alert('찜 완료!'); // 성공 메시지
    } catch (e) {
        console.error('Error updating document: ', e);
        alert('찜 오류...~');
    }
};

/**
 * Firestore에서 사용자가 '좋아요'를 누른 상품 목록을 가져옴
 * @param {string} currentUserId - 현재 로그인한 사용자의 ID
 * @returns {Promise<Array<object>>} - '좋아요'를 누른 상품 목록을 포함하는 Promise 객체를 반환
 * @throws {Error}
 */
export const readUserLike = async (currentUserId) => {
    try {
        // 'user' 컬렉션 -> 'currentUserId' 문서 -> 'like' 서브컬렉션 자체를 참조
        const likeCollectionRef = collection(db, 'user', currentUserId, 'like');

        // getDocs를 사용하여 해당 컬렉션의 모든 문서를 가져옵니다.
        const querySnapshot = await getDocs(likeCollectionRef);

        const likedProducts = [];
        querySnapshot.forEach((doc) => {
            // 각 문서의 ID가 productId이고, 문서 데이터는 likedAt 등을 포함합니다.
            likedProducts.push({
                productId: doc.id, // 문서 ID (이것이 productId)
                ...doc.data(), // 문서 내의 다른 데이터 (예: likedAt)
            });
        });

        if (likedProducts.length > 0) {
            console.log('Liked products data:', likedProducts);
            return likedProducts; // 좋아요한 상품들의 배열 반환
        } else {
            console.log('No liked products found!');
            return []; // 좋아요한 상품이 없으면 빈 배열 반환
        }
    } catch (e) {
        console.error('Error reading liked products: ', e);
        // 사용자에게 오류 알림 또는 적절한 에러 처리
        throw new Error('찜 목록을 불러오는 데 오류가 발생했습니다.'); // 오류를 다시 throw하여 상위에서 처리
    }
};
