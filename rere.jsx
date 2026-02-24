import React, { useState, useEffect } from 'react';
import { Search, LogIn, CheckCircle, ArrowRight, Image as ImageIcon, Download, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore';

// Firebase 초기화
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isTesterApplied, setIsTesterApplied] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [user, setUser] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // 관리자 모드 관련 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const tutorialItems = [
    { id: 1, title: 'Step 1: 링크 분석', desc: '여기에 첫 번째 단계에 대한 설명이 들어갑니다. 이미지와 텍스트는 추후 수정할 수 있습니다.' },
    { id: 2, title: 'Step 2: 키워드 추출', desc: '여기에 두 번째 단계에 대한 설명이 들어갑니다. 이미지와 텍스트는 추후 수정할 수 있습니다.' },
    { id: 3, title: 'Step 3: 프롬프트 완성', desc: '여기에 세 번째 단계에 대한 설명이 들어갑니다. 이미지와 텍스트는 추후 수정할 수 있습니다.' },
  ];

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsLoginPopupOpen(false);
      setCurrentPage('tutorial');
    } catch (error) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        console.warn("미리보기 환경 도메인 제한으로 인해 기본 제공된 테스트 계정으로 진행합니다.");
        setIsLoginPopupOpen(false);
        setCurrentPage('tutorial');
      } else {
        setErrorMessage('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleApplyTester = async () => {
    if (!user) {
      setErrorMessage('로그인 정보가 없습니다. 다시 로그인 해주세요.');
      return;
    }

    try {
      const testersRef = collection(db, 'artifacts', appId, 'public', 'data', 'testers');
      const testerData = {
        uid: user.uid,
        email: user.email || '이메일 없음 (테스트 계정)',
        displayName: user.displayName || '이름 없음 (테스트 유저)',
        appliedAt: new Date().toISOString()
      };
      
      await setDoc(doc(testersRef, user.uid), testerData);
      setIsTesterApplied(true);
    } catch (error) {
      console.error("Save Tester Error:", error);
      setErrorMessage('데이터베이스 저장 중 오류가 발생했습니다.');
    }
  };

  // 엑셀(CSV) 다운로드 함수 (관리자 모드에서만 사용됨)
  const downloadExcel = async () => {
    try {
      const testersRef = collection(db, 'artifacts', appId, 'public', 'data', 'testers');
      const snapshot = await getDocs(testersRef);
      const dataList = snapshot.docs.map(doc => doc.data());

      if (dataList.length === 0) {
        alert("아직 신청한 테스터가 없습니다.");
        return;
      }

      const headers = ['이름', '이메일', '고유ID(UID)', '신청일시'];
      const csvRows = [headers.join(',')];

      dataList.forEach(row => {
        const name = `"${row.displayName}"`;
        const email = `"${row.email}"`;
        const uid = `"${row.uid}"`;
        const date = `"${new Date(row.appliedAt).toLocaleString()}"`;
        csvRows.push([name, email, uid, date].join(','));
      });

      const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '테스터_신청자_목록.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download Error:", error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 숨겨진 관리자 모드 활성화 트리거 (5번 연속 클릭 시)
  const handleSecretClick = () => {
    setSecretClickCount(prev => prev + 1);
    if (secretClickCount >= 4) {
      setIsAdmin(true);
      setSecretClickCount(0);
    }
    
    // 2초 뒤에 클릭 카운트 초기화 (연속 클릭시에만 발동되도록)
    setTimeout(() => {
      setSecretClickCount(0);
    }, 2000);
  };

  const renderLanding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 relative">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
          Enter your link and <br className="hidden md:block" />
          <span className="text-blue-600">expand your inspiration</span>
        </h1>
        
        <p className="text-lg text-gray-600">
          원하는 링크를 입력하고 당신만의 크리에이티브한 프롬프트를 만들어보세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center max-w-2xl mx-auto mt-10 gap-3">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="url"
              className="block w-full pl-11 pr-4 py-4 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-lg shadow-sm"
              placeholder="https://example.com/your-link"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
            />
          </div>
          <button
            onClick={() => setIsLoginPopupOpen(true)}
            className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md transition-colors"
          >
            프롬프트 생성하기
          </button>
        </div>
      </div>

      {isLoginPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center relative">
            <button 
              onClick={() => setIsLoginPopupOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
              <LogIn className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-500 mb-8">프롬프트를 생성하려면 계정을 연결해주세요.</p>
            
            {errorMessage && (
              <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
            )}

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google 계정으로 로그인
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderTutorial = () => (
    <div className="min-h-screen bg-white text-gray-900 font-sans relative">
      {/* 상단 헤더 영역 - 여기에 숨겨진 관리자 트리거를 넣습니다 */}
      <div className="bg-gray-50 border-b border-gray-200 py-12 px-4 text-center">
        <h2 
          className="text-3xl font-bold mb-4 cursor-default select-none"
          onClick={handleSecretClick}
        >
          서비스 튜토리얼
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          본격적인 사용에 앞서 서비스 사용 방법을 간단히 안내해 드립니다.
        </p>
      </div>

      {/* 관리자 모드 활성화 시 상단에 표시되는 비밀 패널 */}
      {isAdmin && (
        <div className="bg-gray-800 text-white p-4 flex flex-col sm:flex-row items-center justify-between shadow-inner animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-2 sm:mb-0">
            <Lock className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">관리자 모드가 활성화되었습니다.</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadExcel}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              전체 신청자 데이터 받기 (.csv)
            </button>
            <button
              onClick={() => setIsAdmin(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-sm font-medium rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 튜토리얼 콘텐츠 영역 */}
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-24">
        {tutorialItems.map((item) => (
          <div key={item.id} className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <div className="aspect-video bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                <span className="text-sm font-medium">이미지 입력 예정 영역 (Step {item.id})</span>
              </div>
            </div>
            
            <div className="w-full md:w-1/2 space-y-4">
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-2">
                Step {item.id}
              </div>
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <p className="text-lg text-gray-600 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 최하단 테스터 신청 영역 */}
      <div className="bg-blue-50 py-20 px-4 text-center border-t border-blue-100 mt-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">준비가 되셨나요?</h2>
          
          {errorMessage && (
            <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
          )}

          {!isTesterApplied ? (
            <button
              onClick={handleApplyTester}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-transform transform hover:-translate-y-1"
            >
              테스터 신청하기
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="inline-flex flex-col items-center p-6 bg-white rounded-2xl shadow-sm border border-green-100 animate-in zoom-in duration-300 w-full max-w-sm">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-xl font-semibold text-gray-900 mb-2">신청이 완료되었습니다.</p>
                <p className="text-gray-600">테스트 차례가 오면 가장 먼저 알려드릴게요!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="font-sans">
      {currentPage === 'landing' ? renderLanding() : renderTutorial()}
    </div>
  );
}