        export async function fetchLectures(){
            try{
                const res = await fetch('./data/cleaned_lectures.json');
                if (!res.ok) throw new Error('Network response was not ok');
                return await res.json();
            }catch(err){
                console.error('講義データの取得に失敗しました:', err);
                throw err;
            }
        }
