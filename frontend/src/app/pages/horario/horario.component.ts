import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HorarioService, Horario, DIAS_SEMANA } from '../../services/horario.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';

interface Columna {
  dia: string;
  etiqueta: string;
  clases: Horario[];
}

// CA-023 · Horario de clases (vista semanal por día)
@Component({
  selector: 'app-horario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './horario.component.html',
  styleUrls: ['./horario.component.scss']
})
export class HorarioComponent implements OnInit {
  private horarioService = inject(HorarioService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly DIAS = DIAS_SEMANA;
  readonly ETIQUETAS: Record<string, string> = {
    LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado',
  };

  horarios = signal<Horario[]>([]);
  materias = signal<{ id: string; codigo: string; nombre: string }[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  mostrarForm = signal(false);

  puedeGestionar = (): boolean => {
    const rol = this.authService.getUserRole();
    return rol === Role.ADMIN || rol === Role.DOCENTE;
  };

  form = this.fb.group({
    materiaId: ['', Validators.required],
    dia: ['LUNES', Validators.required],
    horaInicio: ['07:00', Validators.required],
    horaFin: ['09:00', Validators.required],
    aula: [''],
  });

  /** Agrupa las clases por día para pintar una columna por día de la semana. */
  columnas = computed<Columna[]>(() =>
    this.DIAS.map(dia => ({
      dia,
      etiqueta: this.ETIQUETAS[dia] || dia,
      clases: this.horarios().filter(h => h.dia === dia),
    }))
  );

  totalHoras = computed(() =>
    this.horarios().reduce((acc, h) => {
      const [hi, mi] = h.horaInicio.split(':').map(Number);
      const [hf, mf] = h.horaFin.split(':').map(Number);
      return acc + ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
    }, 0)
  );

  ngOnInit() {
    this.cargar();
    this.horarioService.materias().subscribe({
      next: m => this.materias.set(m),
      error: () => this.materias.set([]),
    });
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.horarioService.listar().subscribe({
      next: d => { this.horarios.set(d); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
  }

  /** Color estable por materia, derivado del código: misma materia = mismo color. */
  colorMateria(codigo: string): string {
    const paleta = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#db2777'];
    let suma = 0;
    for (const c of codigo) suma += c.charCodeAt(0);
    return paleta[suma % paleta.length];
  }

  nuevo() {
    this.form.reset({ materiaId: '', dia: 'LUNES', horaInicio: '07:00', horaFin: '09:00', aula: '' });
    this.mostrarForm.set(true);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.horarioService.crear(v.materiaId!, v.dia!, v.horaInicio!, v.horaFin!, v.aula || undefined).subscribe({
      next: () => { this.mostrarForm.set(false); this.cargar(); },
      error: err => this.error.set(err.message)
    });
  }

  eliminar(h: Horario) {
    if (!confirm(`¿Eliminar la clase de ${h.materia.nombre} del ${this.ETIQUETAS[h.dia]}?`)) return;
    this.horarioService.eliminar(h.id).subscribe({
      next: () => this.cargar(),
      error: err => this.error.set(err.message)
    });
  }
}
